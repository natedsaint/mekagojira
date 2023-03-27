// Do the chrome runtime stuff : set an alarm (interval) to update the data, and handle incoming messages to do an on-demand fetch

let isFetching = false;
const defaultQuery = 'assignee%3DCurrentUser()%20and%20resolution%20=%20Unresolved';

chrome.storage.sync.get({ refreshInterval: 1}, (settings) => {
    chrome.alarms.create('fetchData', {delayInMinutes: 0.1, periodInMinutes: settings.refreshInterval});
});

// if the interval changes, remove the old alarm and make a new one
chrome.storage.onChanged.addListener((changes) => {
    const { refreshInterval } = changes;
    if (refreshInterval?.newValue) {
        chrome.alarms.clearAll();
        chrome.alarms.create('fetchData', {delayInMinutes: 0.1, periodInMinutes: refreshInterval.newValue});
    }
});
/* 
TODO: 
- make the periodInMinutes above configurable via settings
*/

chrome.alarms.onAlarm.addListener(async (_alarm) => {
    chrome.storage.sync.get({popupQuery:defaultQuery, jiraPath:''}, async (settings) => {
        settings.popupQuery = settings.popupQuery.length > 0 || defaultQuery;
        await handleFetch(settings);
    });
});

chrome.runtime.onMessage.addListener(async (message, _sender, _sendResponse) => {
    const { operation, data } = message;
    if (operation === 'fetchData') {
        await handleFetch(data);
    }
    return true;
});

// wrapper for common logic between methods above

const handleFetch = async (data) => {
    const { jiraPath, popupQuery } = data;
    const path = `${jiraPath}/rest/api/latest/search?jql=${popupQuery}`;
    try {
        const displayData = await fetchData(path);
        chrome.storage.local.set({ displayData });
    } catch (e) {
        if (e.message === "401") {
            console.warn('error: need to log in');
            chrome.tabs.create({
                url: `${jiraPath}/login.jsp`
            });
        } else if (e.message === "400") {
            console.warn('invalid request, likely need to fix query');
        }
    }
};

// actual fetch logic, which throws if there's an access issue (fetch just returns a 401, doesn't reject)

const fetchData = async (path) => {
    if (isFetching) {
        return;
    }
    isFetching = true;
    chrome.action.setBadgeText({text: '...'});
    const response = await fetch(path);
    if (response.status !== 200) {
        throw new Error(response.status.toString());
    }
    const responseText = await (response.text());
    isFetching = false;
    const parsedText = JSON.parse(responseText);
    const text = parsedText?.issues?.length.toString();
    chrome.action.setBadgeText({ text });
    return parsedText;
};


