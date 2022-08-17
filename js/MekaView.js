class MekaView  extends HTMLElement {
  static get observedAttributes() {
    return ['loading'];
  }
  get loading() {
    return this.hasAttribute('loading');
  }
  set loading(val) {
    if (val) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (this.loading) {
      this.shadowRoot.querySelector('meka-loader').done = false;
    } else {
      this.shadowRoot.querySelector('meka-loader').done = true;
    }
  }
  constructor() {
    super();
    const me = this;
    me.loading = true;
    me.defaultQuery = 'assignee%3DCurrentUser()%20and%20resolution%20=%20Unresolved';
    const shadow = me.attachShadow({ mode: 'open'});
    const wrapper = document.createElement('div');
    const template = `
      <style>
        :host {
          font-family:"Segoe UI", Roboto, sans-serif;
          height:100%;
          z-index:0;
          margin:0;
          padding:0;
        }
        article {
          z-index:10;
          padding:5px 5px 20px 5px;
        }
      </style>
      
      <article>
        <meka-loader></meka-loader>
        <meka-tasks></meka-tasks>
      </article>
      <meka-nav></meka-nav>
    `;
    wrapper.innerHTML = template;
    me.shadowRoot.appendChild(wrapper);
    me.init();
  }

  async fetchData() {
    const me = this;
    chrome.runtime.sendMessage({operation: 'fetchData', data: { query: me.query, jiraPath: me.jiraPath }});
  }

  updateData(data) {
    const me = this;
    if (data.issues) {
      me.shadowRoot.querySelector('meka-tasks').tasks = data.issues;
      me.loading = false;
    }
  }

  init() {
    const me = this;
    chrome.storage.sync.get({popupQuery:me.defaultQuery, jiraPath:''}, (result) => {
      const { jiraPath } = result;
      if (!jiraPath) {
        chrome.tabs.create({
          active: true,
          url: 'options.html'
        })
        return;
      }
      me.jiraPath = jiraPath;
      me.query = result.popupQuery || me.defaultQuery;
      me.fetchData();
    });

    chrome.storage.onChanged.addListener((changes) => {
      const { jiraPath, query, displayData } = changes;
      if (displayData) {
        me.updateData(displayData.newValue);
      }
      me.jiraPath = jiraPath || me.jiraPath;
      me.query = query || me.query;
      if (jiraPath || query) {
        me.fetchData();
      }
    });
  }
}

export default MekaView;
