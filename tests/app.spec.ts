import path from 'path';
import crypto from 'crypto';
import fsp from 'fs/promises';
import fs from 'fs';
import { test, expect, Page } from '@playwright/test';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import v8toIstanbul from 'v8-to-istanbul';

let page: Page;

/**
 * Test whether file is available and not locked
 * @param {*} filePath
 * @returns
 */
const isAvailable = (filePath) => {
    let fileAccess = false;
    try {
        fs.closeSync(fs.openSync(filePath, 'r+'));
        fileAccess = true;
    } catch (err) {
        //Ignore
    }
    return fileAccess;
};

/**
 * Generate a unique identifier string
 */
function uuidv4(): string {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (crypto && crypto.randomUUID) {
        try {
            const uuid = crypto.randomUUID();
            if (uuid) {
                return uuid;
            }
        } catch (error) {
            console.warn(error);
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
}

/**
 * Transform, save and report coverage results
 * @param {*} page
 * @param {*} config
 * @returns
 */
const saveV8Coverage = async (page, config) => {
    let coverage = await page.coverage.stopJSCoverage();

    // Create coverage output directory if necessary
    if (!fs.existsSync(`./coverage`)) {
        await fsp.mkdir(`./coverage`, {
            recursive: true
        });
    }

    //Save coverage information for current test worker
    fs.writeFileSync(`coverage/${uuidv4()}.json`, JSON.stringify(coverage), {
        encoding: 'utf-8'
    });

    coverage = [];
    let files = await fsp.readdir(`coverage`);

    //Only the last running worker should report coverage, if the number of saved coverage is less than the workers, stop processing
    if (
        files.filter((f) => {
            f = `coverage/${f}`;
            return f.toLowerCase().endsWith('.json') && fs.existsSync(f) && isAvailable(f);
        }).length < config.workers
    ) {
        return;
    }

    //Load and merge coverage information from all test workers
    for (let index = 0; index < files.length; index++) {
        const f = `coverage/${files[index]}`;
        if (f.toLowerCase().endsWith('.json') && fs.existsSync(f)) {
            try {
                //Wait and test for coverage file availability. Files may be locked if other workers are still writing
                while (!isAvailable(f)) {
                    await new Promise((resolve) => {
                        setTimeout(resolve, 100);
                    });
                    if (!fs.existsSync(f)) {
                        break;
                    }
                }
                if (!fs.existsSync(f)) {
                    continue;
                }
                const cov = await fsp.readFile(f, 'utf-8');
                coverage = [...coverage, ...JSON.parse(cov)];
            } catch (error) {
                throw new Error(`Read fail: \r\n\r\n${error.toString()}`);
            }
        }
    }

    const cwd = process.cwd();
    const map = libCoverage.createCoverageMap();
    for (const entry of coverage) {
        try {
            //Skip any external scripts, we only care about code coverage related to our source code
            if (
                entry.url === '' ||
                !entry.url.startsWith('http://localhost:6009') ||
                (entry.url.includes('/__') && !entry.url.includes('/__wds-outside-root__/1/dist'))
            ) {
                continue;
            }
            let scriptPath = `${cwd}/example${new URL(entry.url).pathname}`;
            if (scriptPath.includes('/__wds-outside-root__/1/dist')) {
                scriptPath = scriptPath.replace('/__wds-outside-root__/1/dist/', '/../dist/');
            }
            const converter = v8toIstanbul(scriptPath, 0, { source: entry.source }, (filepath) => {
                const normalized = filepath.replace(/\\/g, '/');

                // Vendor code do not need to have coverage checked
                const ret = normalized.includes('node_modules/') || normalized.includes('node-modules');
                return ret;
            });
            await converter.load();
            converter.applyCoverage(entry.functions);
            const data = converter.toIstanbul();
            map.merge(data);
        } catch (error) {
            console.error(entry.url, error);
        }
    }
    const context = libReport.createContext({ coverageMap: map });

    //Report both to html for detailed coverage report as well as console for terminal output
    reports.create('html').execute(context);
    reports.create('text').execute(context);
};

test.beforeAll(async ({ browser }) => {
    try {
        await fsp.rm('coverage', { force: true, recursive: true });
    } catch (error) {
        //Ignore
    }
    page = await browser.newPage();

    //Each test worker must start collecting coverage information for the duration of its tests
    await page.coverage.startJSCoverage();
});

test.afterAll(async ({}, { config }) => {
    //Each test worker must collect and save its coverage information. The last worker will also report the coverage
    await saveV8Coverage(page, config);
    await page.close();
});

test('test widget', async () => {
    const response = 'Test Content';
    page.on('dialog', (dialog) => {
        dialog.accept(response);
    });
    await page.goto('http://localhost:6009');

    await page.locator('button').click();

    const text = await page.frameLocator('iframe').locator('#text-message').innerText();
    await expect(text).toContain(response);
});
