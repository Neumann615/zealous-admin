import DefaultTheme from 'vitepress/theme'
import FeedbackPanel from './components/FeedbackPanel.vue'
import TechMarquee from './components/TechMarquee.vue'
import Layout from './Layout.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('TechMarquee', TechMarquee)
    app.component('FeedbackPanel', FeedbackPanel)
  },
}
