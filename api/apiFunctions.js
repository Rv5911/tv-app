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
        // If no macID is provided, try to get it from localStorage
        if(!macID){
            macID = localStorage.getItem("deviceMacId");
            
            // If still no macID, try to fetch the device's macID
            if (!macID) {
                const deviceData = await getDeviceMacId();
                macID = deviceData?.macAddress;
            }
            
            // If we still don't have a macID, throw an error
            if (!macID) {
                throw new Error("No MAC ID available");
            }
        }
        
        // Fetch the M3U URL using the macID
        const response = await fetch(`${API_ENDPOINTS.GET_M3U_URL}/${macID}`);
        
        // Check if the response is ok
        if (!response.ok) {
            throw new Error(`Failed to fetch M3U URL: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if we have a valid link
        if (!data.link) {
            throw new Error("No M3U link found in the response");
        }
        
        // Parse the M3U content
        try {
            await parseM3UContent(data.link);
        } catch (parseError) {
            console.error("Error parsing M3U content:", parseError);
            // Continue even if parsing fails, so the caller can still use the M3U URL
        }
        
        return data;
    } catch (error) {
        console.error("Error fetching m3u url:", error);
        throw error;
    }
}