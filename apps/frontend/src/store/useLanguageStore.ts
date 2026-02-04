import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/i18n/translations'

interface LanguageState {
	language: Language
	setLanguage: (language: Language) => void
	toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set) => ({
			language: 'en', // Default to English
			setLanguage: (language) => set({ language }),
			toggleLanguage: () =>
				set((state) => ({
					language: state.language === 'en' ? 'zh' : 'en',
				})),
		}),
		{
			name: 'language-storage',
		}
	)
)
