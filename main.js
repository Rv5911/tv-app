import { getAllMacIds, getDeviceMacId, getM3UUrl } from "./api/apiFunctions.js";
import { parseM3UContent } from "./utils/parseM3U.js";

const deviceMacId = localStorage.getItem("deviceMacId");

getDeviceMacId().then((data) => {
    console.log(data, "getDeviceMacId");
})

getM3UUrl(deviceMacId).then((data) => {
    parseM3UContent(data?.link).then((data) => {
        console.log(data, "parseM3UContent");
    })
});

getAllMacIds().then((data) => {
    console.log(data, "getAllMacIds");
});

