import fse from "fs-extra";
import path from "path";
import util from "util";
import childProcess from "child_process";
import {isDefined} from "../utils/index.js";
import Ajv from 'ajv';
import {SchoolConfig} from "../models/config/school.js";
import {TerritoriesConfig} from "../models/config/territories.js";

const exec = util.promisify(childProcess.exec);

const repoLocation = "D:/node-projects/timetable-data"; // TODO: Use env variable
const repoUrl = "https://github.com/dominik-korsa/timetable-data";

async function cloneRepo() {
    console.log("Cloning data repo...");
    await fse.ensureDir(path.join(repoLocation, "../"));
    await exec(`git clone "${repoUrl}" "${repoLocation}"`);
}

export async function updateRepo() {
    if (!await fse.exists(path.join(repoLocation, "./.git"))) await cloneRepo();
    console.log("Updating data repo...");
    await exec(`git -C "${repoLocation}" fetch`);
    await exec(`git -C "${repoLocation}" pull`);
}

async function findSchoolConfigPathsInFolder(dir: string): Promise<string[]> {
    try {
        let schoolPath = path.join(dir, 'school.json');
        if (await fse.exists(schoolPath)) return [schoolPath];
        const files = await fse.readdir(dir, {withFileTypes: true});
        const configs = (await Promise.all(files.map((file) => {
            if (file.isDirectory()) return findSchoolConfigPathsInFolder(path.join(file.path, file.name));
            return [];
        }))).flat();
        if (configs.length === 0) console.warn(`No school.json files found in folder ${dir}`);
        return configs;
    } catch (error) {
        console.error(`Failed to traverse directory ${dir}`, error);
        return [];
    }
}

const ajv = new Ajv({
    allErrors: true,
});
const validateConfig = ajv.compile<SchoolConfig>(SchoolConfig);
const validateTerritories = ajv.compile<TerritoriesConfig>(TerritoriesConfig);

export async function loadSchoolConfigs() {
    console.log("Looking for school.json files...");
    const configPaths = await findSchoolConfigPathsInFolder(path.join(repoLocation, "schools"));
    return (await Promise.all(configPaths.map(async (configPath) => {
        try {
            const config = await fse.readJson(configPath, 'utf-8');
            const isValid = validateConfig(config);
            if (isValid) return config as SchoolConfig;
            validateConfig.errors!.forEach((error) => {
                console.error(`Error while parsing ${configPath}`, error);
            });
            return undefined;
        } catch (error) {
            console.error(`Error while loading ${configPath}`, error);
            return undefined;
        }
    }))).filter(isDefined);
}

export interface TerritoriesResolvedConfig {
    duplicateCounties: Set<string>,
    duplicateTowns: Set<string>,
}

export async function loadTerritoriesConfig(): Promise<TerritoriesResolvedConfig> {
    const configPath = path.join(repoLocation, "territories.json");
    const json = await fse.readJson(configPath);
    if (!validateTerritories(json)) {
        validateTerritories.errors!.forEach((error) => {
            console.error(`Error while parsing ${path}`, error);
        });
        throw new Error(`Failed to parse ${configPath}`);
    }
    return {
        duplicateCounties: new Set(json.duplicateCounties),
        duplicateTowns: new Set(json.duplicateTowns),
    }
}
