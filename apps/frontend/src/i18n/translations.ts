export type Language = 'en' | 'zh'

export interface Translations {
	fileUpload: {
		title: string
		dropText: string
		formats: string
		maxSize: string
		uploading: string
	}
	errors: {
		unsupportedFormat: string
		fileTooLarge: string
		uploadFailed: string
	}
	status: {
		pending: string
		processing: string
		completed: string
		failed: string
		cancelled: string
	}
}

export const translations: Record<Language, Translations> = {
	en: {
		fileUpload: {
			title: 'File Upload',
			dropText: 'Click or drag file here',
			formats: 'Formats: png/jpg/jpeg, pdf',
			maxSize: 'Max 20MB',
			uploading: 'Uploading...',
		},
		errors: {
			unsupportedFormat: 'Unsupported file format. Supported formats: {formats}',
			fileTooLarge: 'File size exceeds limit. Current: {current}, Max: {max}',
			uploadFailed: 'File upload failed',
		},
		status: {
			pending: 'Pending',
			processing: 'Processing',
			completed: 'Completed',
			failed: 'Failed',
			cancelled: 'Cancelled',
		},
	},
	zh: {
		fileUpload: {
			title: '文件上传',
			dropText: '点击或拖拽文件到此处',
			formats: '格式：png/jpg/jpeg, pdf',
			maxSize: '最大 20MB',
			uploading: '上传中...',
		},
		errors: {
			unsupportedFormat: '不支持的文件格式。支持的格式：{formats}',
			fileTooLarge: '文件大小超过限制。当前文件：{current}，最大允许：{max}',
			uploadFailed: '文件上传失败',
		},
		status: {
			pending: '等待中',
			processing: '处理中',
			completed: '已完成',
			failed: '失败',
			cancelled: '已取消',
		},
	},
}

// Helper function for template string replacement
export function t(
	key: string,
	lang: Language,
	params?: Record<string, string | number>
): string {
	const keys = key.split('.')
	let value: any = translations[lang]
	for (const k of keys) {
		value = value?.[k]
	}
	if (typeof value !== 'string') {
		return key
	}
	if (params) {
		return Object.entries(params).reduce(
			(str, [k, v]) => str.replace(`{${k}}`, String(v)),
			value
		)
	}
	return value
}
