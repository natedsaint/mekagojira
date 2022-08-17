class MekaOptions extends HTMLElement {
  constructor() {
    super();
    let me = this;
    this.attachShadow({ mode: 'open'});
    const wrapper = document.createElement('div');
    const template = `
      <style>
        form {
          max-width:1000px;
          min-width:600px;
          margin:0 auto;
        }
      
        .formGroup {
          display:block;
          padding:20px;
          margin:10px;
          background:#eee;
        }
      
        .formGroup label {
          width:100px;
          display:inline-block;
        }
      
        .formGroup input, .formGroup select {
          padding:5px;
          width:200px;
        }
      </style>
      <form method="get" action="">
        <div class="formGroup">
          <label for="popupQuery">Popup Query</label>
          <input type="text" id="popupQuery" name="popupQuery" />
          <em>(leave blank for default of all your assigned unresolved issues)</em>
        </div>
        <div class="formGroup">
          <label for="savedFilters">Saved Filters</label>
          <input list="filters" id="savedFilters">
          <datalist id="filters">
          </datalist>
        </div>
        <div class="formGroup">
        <label for="jiraPath">Jira Path</label>
        <input type="text" id="jiraPath" name="jiraPath" />
        <em>(e.g. https://jira.domain.com/ or https://our.domain.com/jira/)</em>
        </div>
        <div class="formGroup" id="message">

        </div>
        <div class="formGroup">
          <button type="button" id="saveSettingButton">Save</button>
        </div>
      </form>
    `;
    wrapper.innerHTML = template;
    this.shadowRoot.appendChild(wrapper);

    me.loadFormData();
  
    me.shadowRoot.getElementById("saveSettingButton").addEventListener("click",() => {
      chrome.storage.sync.set({
        'popupQuery':me.shadowRoot.getElementById('popupQuery').value,
        'jiraPath': me.shadowRoot.getElementById('jiraPath').value.replace(/\/+$/, '')
      },() => {
        me.loadFormData();
        this.shadowRoot.getElementById('message').innerHTML = 'Options saved at ' + new Date();
      });
    });
  }

  loadFormData() {
    const me = this;
    chrome.storage.sync.get({popupQuery:'', jiraPath: ''}, (result) => {
      if (result.popupQuery) {
        this.shadowRoot.getElementById('popupQuery').value = result.popupQuery;
      }
      if (result.jiraPath) {
        this.shadowRoot.getElementById('jiraPath').value = result.jiraPath;
      } else {
        this.shadowRoot.getElementById('message').innerHTML = 'Jira Path is reqired!';
        this.shadowRoot.getElementById('message').style.color = '#f00';
      }
      me.getFilters();
    });
  }

  getFilters() {
    const me = this;
    chrome.storage.sync.get({jiraPath: null}, async (result) => {
      if (result.jiraPath) {
        const data = await fetch(`${result.jiraPath}/rest/api/latest/filter/favourite`);
        const content = await data.text();
        me.renderFilters(JSON.parse(content));
      }
    });
  }

  renderFilters(filterData) {
    const me = this;
    const filters = me.shadowRoot.getElementById('filters');
    const savedFilters = me.shadowRoot.getElementById('savedFilters');
    const popupQuery = me.shadowRoot.getElementById('popupQuery');
    const filterHtml = '<option value="">- - -</option>';

    me.savedFilters = filterData;
    me.savedFilters.forEach((filter) => {
      filterHtml += `<option value="${filter.id}">${filter.name}</option>`;
    });
    filters.innerHTML = filterHtml;
    savedFilters.addEventListener('input', (event) => {
      const filter = me.savedFilters.find((element) => {
        return element.id === event.target.value; // coming from text field on both sides
      });
      if (filter) {
        popupQuery.value = filter.jql;
      } else {
        popupQuery.value = '';
      }

    });

  }

}

export default MekaOptions;
