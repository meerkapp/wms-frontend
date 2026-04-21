import { useI18n } from 'vue-i18n'
import type { Characteristic } from '@meerkapp/wms-contracts'
import { useAppDialog } from '@/core/composables/useAppDialog'
import AddCharacteristicDialog from '../components/AddCharacteristicDialog.vue'

type CharacteristicType = Characteristic['type']

interface CharacteristicData {
  label: string
  key: string
  type: CharacteristicType
}

type CharacteristicDefaults = {
  [K in CharacteristicType]: Omit<Extract<Characteristic, { type: K }>, 'label' | 'key' | 'type'>
}

const typeDefaults: CharacteristicDefaults = {
  number: { required: false, validation: {}, ui: {} },
  select: { required: false, options: [] },
  toggle: { required: false, true_label: '', false_label: '' },
  checkbox: {},
}

export function useCharacteristicsField(addCharacteristic: (value: Characteristic) => void) {
  const { t } = useI18n()
  const dialog = useAppDialog()

  function onAddCharacteristic(data: CharacteristicData) {
    addCharacteristic({
      label: data.label,
      key: data.key,
      type: data.type,
      ...typeDefaults[data.type],
    } as Characteristic)
  }

  function openAddCharacteristicDialog() {
    dialog.open(AddCharacteristicDialog, {
      props: {
        header: t('product.type.form.characteristic.addTitle'),
        modal: true,
        style: { width: '26rem' },
      },
      onClose: (options) => {
        if (options?.data) onAddCharacteristic(options.data)
      },
    })
  }

  return { openAddCharacteristicDialog }
}
