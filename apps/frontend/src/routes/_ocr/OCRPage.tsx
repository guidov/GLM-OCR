// import { useState } from 'react'
// import { useEffect } from 'react'
import { FileUpload, type TaskResponse, type UploadedFile } from './FileUpload'
import { FilePreview } from './FilePreview'
import { OCRResults } from './OCRResults'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useState } from 'react'

export function OCRPage() {
	const [uploadFile, setUploadFile] = useState<UploadedFile | null>(null)
	const [parsedResult, setParsedResult] = useState<TaskResponse | null>(null)




	return (
		<div className='h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950'>
			{/* Header with language toggle */}
			<header className='h-14 border-b border-border bg-white dark:bg-gray-900 flex items-center justify-between px-4 shrink-0'>
				<h1 className='text-lg font-semibold'>GLM-OCR</h1>
				<LanguageToggle />
			</header>

			<div className='flex-1 flex overflow-hidden'>
				{/* 左侧栏 - 文件上传 */}
				<div className='w-60 shrink-0'>
					<FileUpload
						onFileUploaded={file => {
							setUploadFile(file)
						}}
						onTaskStatusChange={data => {
							setParsedResult(data)
						}}
					/>
				</div>

				<main className='flex-1 min-w-0 grid grid-cols-2 overflow-hidden'>
					<FilePreview file={uploadFile} result={parsedResult} />
					<OCRResults result={parsedResult} fileName={uploadFile?.name} />
				</main>
			</div>
		</div>
	)
}
