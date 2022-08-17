chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { operation, data } = message;
    if (operation === 'fetchData') {
        const { jiraPath, query } = data;
        const path = `${jiraPath}/rest/api/latest/search?jql=${query}`;
        fetchData(path).then((responseData) => {
            chrome.storage.local.set({displayData: responseData});
        });
    }
    return true;
});

let isFetching = false;

const fetchData = async (path) => {
    if (isFetching) {
        return;
    }
    isFetching = true;
    chrome.action.setBadgeText({text: '...'});
    const response = await fetch(path);
    const responseText = await (response.text());
    isFetching = false;
    const parsedText = JSON.parse(responseText);
    const text = parsedText?.issues?.length.toString();
    chrome.action.setBadgeText({ text });
    return parsedText;
};

const defaultQuery = 'assignee%3DCurrentUser()%20and%20resolution%20=%20Unresolved';

chrome.alarms.create('fetchData', {delayInMinutes: 0.1, periodInMinutes: 1});

/* 
TODO: 
- write this data from the backend to chrome storage, then have the popup and everything else just listen to that for changes
- make the periodInMinutes above configurable via settings
- make sure the fetching check is somewhere that will work correctly
*/
chrome.alarms.onAlarm.addListener((alarm) => {
    chrome.storage.sync.get({popupQuery:defaultQuery, jiraPath:''}, (settings) => {
        const { jiraPath, popupQuery } = settings;
        const query = popupQuery || defaultQuery;
        if (!jiraPath) {
            return;
        }
        const path = `${jiraPath}/rest/api/latest/search?jql=${query}`;
        fetchData(path).then((data) => {
            chrome.storage.local.set({displayData: data});
        });
    });
});
