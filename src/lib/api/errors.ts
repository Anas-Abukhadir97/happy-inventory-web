import { BusinessError } from './business'

export function errorText(error: unknown, t: (key: string) => string) {
  if (error instanceof BusinessError) {
    const keys: Record<string, string> = {
      invalid_request: 'invalidInput',
      not_found: 'recordNotFound',
      conflict: 'recordConflict',
      stale_version: 'staleRecord',
      precondition_required: 'staleRecord',
      access_forbidden: 'accessForbidden',
      authentication_required: 'requestUnauthorized',
      notification_channel_unavailable: 'notificationChannelUnavailable',
    }
    return t(keys[error.code] ?? 'serviceUnavailable')
  }
  return t('serviceUnavailable')
}
