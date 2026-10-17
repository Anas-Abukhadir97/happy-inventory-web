import createClient from 'openapi-fetch'
import type { paths } from './generated'

// The paths are generated from the pinned, reviewed API contract snapshot.
export const apiClient = createClient<paths>({ baseUrl: '', credentials: 'same-origin' })
