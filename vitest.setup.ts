import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals kapalı olduğundan Testing Library kendiliğinden temizlik yapmaz.
afterEach(cleanup)
