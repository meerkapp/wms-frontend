import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'
import 'dayjs/locale/en'

dayjs.extend(relativeTime)

export { dayjs }
