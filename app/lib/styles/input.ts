// Shared autofill styles to avoid duplication
const autofillStyles = 'autofill:bg-white autofill:text-gray-900 autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255)] rounded-2xl'

// Shared disabled/readonly state modifiers
const stateModifiers = 'disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50/50 disabled:border-gray-100 read-only:text-gray-900 read-only:bg-gray-50/20'

const commonBase = `block w-full h-11 rounded-2xl text-sm py-2.5 px-4 bg-white text-gray-900 border border-gray-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 hover:border-gray-300 ${autofillStyles} ${stateModifiers}`

export const inputBaseStyles = `${commonBase} placeholder:text-gray-400`
export const inputErrorStyles = `block w-full h-11 rounded-2xl text-sm py-2.5 px-4 bg-red-50/10 text-gray-900 border border-red-200 ring-1 ring-red-500/20 focus:outline-none transition-all duration-200 ${autofillStyles} ${stateModifiers}`

export const selectBaseStyles = commonBase
export const selectErrorStyles = `block w-full h-11 rounded-2xl text-sm py-2.5 px-4 bg-red-50/10 text-gray-900 border border-red-200 ring-1 ring-red-500/20 focus:outline-none transition-all duration-200 ${autofillStyles} ${stateModifiers}`

export const textareaBaseStyles = `block w-full rounded-2xl text-sm py-2.5 px-4 bg-white text-gray-900 border border-gray-200 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 hover:border-gray-300 placeholder:text-gray-400 resize-vertical ${autofillStyles} ${stateModifiers}`
