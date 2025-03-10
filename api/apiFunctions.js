import { parseM3UContent } from "../utils/parseM3U.js";
import { API_ENDPOINTS } from "./apiEndpoints.js";

export async function getAllMacIds(){
   try {
    const response = await fetch(`${API_ENDPOINTS.GET_ALL_MAC_IDS}`);
    const data = await response.json();
    localStorage.setItem("allMacIds", JSON.stringify(data));
    return data;
   } catch (error) {
    console.error("Error fetching macids:", error);
    throw error;
   }
}

export async function getDeviceMacId(){
    try {
        const response = await fetch(`${API_ENDPOINTS.GET_DEVICE_MAC_ID}`);
        const data = await response.json();
        localStorage.setItem("deviceMacId", data?.macAddress);
        return data;
    } catch (error) {   
        console.error("Error fetching macid:", error);
        throw error;
    }
}

export async function getM3UUrl(macID){
    try {
        if(!macID){
            macID = localStorage.getItem("deviceMacId");
        }else{
            const response = await fetch(`${API_ENDPOINTS.GET_M3U_URL}/${macID}`);
            const data = await response.json();
            parseM3UContent(data.link)
            return data;
        }
    } catch (error) {
        console.error("Error fetching m3u url:", error);
        throw error;
    }
}