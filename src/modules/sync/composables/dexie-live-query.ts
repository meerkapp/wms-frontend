import { liveQuery, type Observable } from 'dexie'
import {
  shallowRef,
  toValue,
  watch,
  watchEffect,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'

export function useDexieLiveQuery<T>(
  query: () => Promise<T>,
  initialValue: T,
): ShallowRef<T> {
  const result = shallowRef(initialValue) as ShallowRef<T>

  watchEffect((onCleanup) => {
    const subscription = liveQuery(query).subscribe({
      next: (value) => {
        result.value = value
      },
      error: (error) => {
        console.error('[dexie-live-query]', error)
      },
    })

    onCleanup(() => subscription.unsubscribe())
  })

  return result
}

export function useDexieLiveQueryById<T>(
  id: MaybeRefOrGetter<number | string | null | undefined>,
  query: (id: number | string) => Promise<T | undefined>,
): ShallowRef<T | undefined> {
  const result = shallowRef<T | undefined>(undefined)

  watch(
    () => toValue(id),
    (value, _previousValue, onCleanup) => {
      result.value = undefined
      if (value === null || value === undefined) return

      const subscription = liveQuery(() => query(value)).subscribe({
        next: (nextValue) => {
          result.value = nextValue
        },
        error: (error) => {
          console.error('[dexie-live-query]', error)
        },
      })

      onCleanup(() => subscription.unsubscribe())
    },
    { immediate: true },
  )

  return result
}

export function subscribeDexieLiveQuery<T>(
  query: () => Promise<T>,
  onNext: (value: T) => void,
): () => void {
  const subscription = (liveQuery(query) as Observable<T>).subscribe({
    next: onNext,
    error: (error) => console.error('[dexie-live-query]', error),
  })

  return () => subscription.unsubscribe()
}
