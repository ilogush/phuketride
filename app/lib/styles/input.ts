// Shared autofill styles to avoid duplication
const autofillStyles = 'autofill:bg-white autofill:text-gray-800 autofill:shadow-[inset_0_0_0px_1000px_rgb(255,255,255)]'

// Shared disabled/readonly state modifiers
const stateModifiers = 'disabled:bg-gray-200 disabled:text-gray-800 disabled:cursor-not-allowed disabled:border-gray-200 read-only:bg-gray-200 read-only:text-gray-800 read-only:cursor-not-allowed read-only:border-gray-200'

export const inputBaseStyles = `block w-full h-10 rounded-xl text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400 ${autofillStyles} ${stateModifiers}`

export const inputErrorStyles = `block w-full h-10 rounded-xl border border-gray-300 text-sm py-2.5 px-4 bg-white text-gray-800 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400 ${autofillStyles} ${stateModifiers}`

export const selectBaseStyles = `block w-full h-10 rounded-xl text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors ${autofillStyles} ${stateModifiers}`

export const selectErrorStyles = `block w-full h-10 rounded-xl text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors ${autofillStyles} ${stateModifiers}`

export const textareaBaseStyles = `block w-full rounded-3xl text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400 resize-vertical ${autofillStyles} ${stateModifiers}`
