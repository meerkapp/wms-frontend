import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import DialogService from 'primevue/dialogservice'
import Tooltip from 'primevue/tooltip'

import App from './App.vue'
import router from './router'
import { i18n } from './plugins/i18n'
import { primevue } from './plugins/primevue'
import './assets/main.css'
import './plugins/dayjs'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(...primevue)
app.use(ToastService)
app.use(ConfirmationService)
app.use(DialogService)
app.directive('tooltip', Tooltip)

app.mount('#app')
