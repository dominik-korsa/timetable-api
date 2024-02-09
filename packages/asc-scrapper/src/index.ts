export * from './client.js';

import axios from 'axios';
import { Client } from './client.js';

const client = new Client(axios.create(), 'v-lo-krakow');
const list = await client.getTimetableVersionList();
console.log(await client.getTimetableVersion(list[0].number));
