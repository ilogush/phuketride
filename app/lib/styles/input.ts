export const inputBaseStyles = 'block w-full h-10 rounded-xl sm:text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400'

export const inputErrorStyles = 'block w-full h-10 rounded-xl border border-gray-300 sm:text-sm py-2.5 px-4 bg-white text-gray-800 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400'

export const selectBaseStyles = 'block w-full h-10 rounded-xl sm:text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200'

export const textareaBaseStyles = 'block w-full rounded-xl sm:text-sm py-2.5 px-4 bg-white text-gray-800 border border-gray-300 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-sm placeholder:text-gray-400'

export const inputReadOnlyStyles = 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'

export const inputStateModifiers = 'read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-not-allowed read-only:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200'

export const inputWithStates = `${inputBaseStyles} ${inputStateModifiers}`
