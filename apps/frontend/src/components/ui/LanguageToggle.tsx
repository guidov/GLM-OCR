import { Languages } from 'lucide-react'
import { useLanguageStore } from '@/store/useLanguageStore'
import { Button } from '@/components/ui/button'

export function LanguageToggle() {
	const { language, toggleLanguage } = useLanguageStore()

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={toggleLanguage}
			className="flex items-center gap-2"
		>
			<Languages className="size-4" />
			<span className="font-medium">{language === 'en' ? 'EN' : '中文'}</span>
		</Button>
	)
}
