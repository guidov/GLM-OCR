import { useState, useEffect, useRef, useMemo, type RefObject } from 'react'
import type { TaskResponse, UploadedFile } from './FileUpload'
import { useOcrStore } from '../../store/useOcrStore'
import PdfViewer from '@/components/ocr/PdfViewer'
import { usePdfPageMetrics } from '@/hooks/usePdfPageMetrics'
import { useFileBlockInteraction } from '@/hooks/useFileBlockInteraction'
import { usePdfScrollToBlock } from '@/hooks/usePdfScrollToBlock'
import { HighlightOverlay } from '@/components/ocr/HighlightOverlay'
import { maasToPage } from '../../libs/blockUtils'

interface FilePreviewProps {
	file: UploadedFile | null
	result: TaskResponse | null
}

export function FilePreview({ file, result }: FilePreviewProps) {
	const [pdfUrl, setPdfUrl] = useState<string | null>(file?.file?.name || null)
	const viewerRef = useRef<HTMLDivElement>(null)
	const imageRef = useRef<HTMLImageElement>(null)
	const hoveredBlockId = useOcrStore(s => s.hoveredBlockId)
	const clickedBlockId = useOcrStore(s => s.clickedBlockId)
	const setHoveredBlockId = useOcrStore(s => s.setHoveredBlockId)
	const setClickedPdfBlockId = useOcrStore(s => s.setClickedPdfBlockId)
	const blocks = useOcrStore(s => s.blocks)

	const [showCopyButton, setShowCopyButton] = useState(false)

	// 获取 PDF 原始尺寸（从 metadata 或默认值）
	const pdfOriginalWidth = result?.response?.metadata?.width ?? 1654
	const pdfOriginalHeight = result?.response?.metadata?.height ?? 2339


	const isValid = useMemo(() => {
		return !isNaN(pdfOriginalWidth) && !isNaN(pdfOriginalHeight) && result?.status === 'completed'
	}, [pdfOriginalWidth, pdfOriginalHeight, result?.status])

	// 获取当前高亮的 block
	const hoveredBlock = hoveredBlockId ? blocks.find(b => b.id === hoveredBlockId) : null
	const clickedBlock = clickedBlockId ? blocks.find(b => b.id === clickedBlockId) : null
	// 优先显示点击的 block，否则显示悬停的 block
	const activeBlock = clickedBlock || hoveredBlock || null

	// 计算图片的缩放比例和偏移量
	// Now using 0-1000 normalized coordinates for bbox
	// 计算图片的缩放比例和偏移量
	const [imageMetric, setImageMetric] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 })
	useEffect(() => {
		if (!imageRef.current || file?.type === 'application/pdf') return

		const updateImageScale = () => {
			const img = imageRef.current
			if (!img) return

			const imgRect = img.getBoundingClientRect()
			const containerRect = img.parentElement?.getBoundingClientRect()
			if (!containerRect) return

			// 计算图片在容器中的偏移量（考虑 object-contain 的居中效果）
			const offsetX = imgRect.left - containerRect.left
			const offsetY = imgRect.top - containerRect.top

			setImageMetric({ width: imgRect.width, height: imgRect.height, offsetX, offsetY })
		}

		// 图片加载完成后更新
		const img = imageRef.current
		if (img.complete) {
			updateImageScale()
		} else {
			img.addEventListener('load', updateImageScale)
		}

		// 监听窗口大小变化
		window.addEventListener('resize', updateImageScale)

		return () => {
			img.removeEventListener('load', updateImageScale)
			window.removeEventListener('resize', updateImageScale)
		}
	}, [pdfUrl, file?.type])

	const pdfPageMetrics = usePdfPageMetrics(
		viewerRef as RefObject<HTMLDivElement>,
		pdfUrl,
		file?.type,
		isValid,
		activeBlock,
		pdfOriginalWidth,
		pdfOriginalHeight
	)

	// 使用 block 交互 hook
	const {
		handlePdfClick,
		handlePdfMouseMove,
		handlePdfMouseLeave,
		handleImageClick,
		handleImageMouseMove,
		handleImageMouseLeave
	} = useFileBlockInteraction({
		blocks,
		resultStatus: result?.status,
		setHoveredBlockId,
		setClickedBlockId: setClickedPdfBlockId,
		setShowCopyButton
	})

	// 使用滚动 hook
	usePdfScrollToBlock(
		clickedBlockId,
		clickedBlock ?? null,
		viewerRef as RefObject<HTMLDivElement>,
		pdfOriginalWidth,
		pdfOriginalHeight,
		result?.status
	)

	useEffect(() => {
		if (!hoveredBlockId && !clickedBlockId) {
			setShowCopyButton(false)
		}
	}, [hoveredBlockId, clickedBlockId])

	// 当文件变化时，创建 URL
	useEffect(() => {
		if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
			const url = URL.createObjectURL(file.file)
			setPdfUrl(url)

			return () => {
				URL.revokeObjectURL(url)
			}
		} else {
			setPdfUrl(null)
		}
	}, [file])



	const renderPdfPageOverlay = (pageNumber: number) => {
		if (!activeBlock || !activeBlock.bbox) return null
		if (activeBlock.pageIndex !== pageNumber) return null

		const metrics = pdfPageMetrics[pageNumber]
		if (!metrics) return null

		// MaaS uses 0-1000 coordinates relative to PADDED square image
		const maxDim = Math.max(pdfOriginalWidth, pdfOriginalHeight)
		const padX = (maxDim - pdfOriginalWidth) / 2
		const padY = (maxDim - pdfOriginalHeight) / 2

		// Convert MaaS -> Page Fraction
		const xFrac = maasToPage(activeBlock.bbox[0], pdfOriginalWidth, maxDim, padX)
		const yFrac = maasToPage(activeBlock.bbox[1], pdfOriginalHeight, maxDim, padY)

		// Convert Length -> Fraction (no offset padding)
		const wFrac = (activeBlock.width / 1000 * maxDim) / pdfOriginalWidth
		const hFrac = (activeBlock.height / 1000 * maxDim) / pdfOriginalHeight

		return (
			<HighlightOverlay
				block={activeBlock}
				showCopyButton={showCopyButton}
				style={{
					left: metrics.offsetX + xFrac * metrics.width,
					top: metrics.offsetY + yFrac * metrics.height,
					width: wFrac * metrics.width,
					height: hFrac * metrics.height
				}}
			/>
		)
	}

	const renderImageOverlay = () => {
		if (!activeBlock || !activeBlock.bbox || !imageRef.current) return null

		const natW = imageRef.current.naturalWidth
		const natH = imageRef.current.naturalHeight
		const maxDim = Math.max(natW, natH)
		const padX = (maxDim - natW) / 2
		const padY = (maxDim - natH) / 2

		const xFrac = maasToPage(activeBlock.bbox[0], natW, maxDim, padX)
		const yFrac = maasToPage(activeBlock.bbox[1], natH, maxDim, padY)
		const wFrac = (activeBlock.width / 1000 * maxDim) / natW
		const hFrac = (activeBlock.height / 1000 * maxDim) / natH

		return (
			<HighlightOverlay
				block={activeBlock}
				showCopyButton={showCopyButton}
				style={{
					left: imageMetric.offsetX + xFrac * imageMetric.width,
					top: imageMetric.offsetY + yFrac * imageMetric.height,
					width: wFrac * imageMetric.width,
					height: hFrac * imageMetric.height
				}}
				copyButtonClassName='right-6'
			/>
		)
	}

	if (!file) {
		return (
			<div className='h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
				<div className='text-center text-gray-500'>
					<p className='text-lg'>请选择或上传文件</p>
				</div>
			</div>
		)
	}

	return (
		<div className='pdf-preview h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative'>
			<div className='flex-1 h-full overflow-hidden' ref={viewerRef}>
				{file.type === 'application/pdf' ? (
					<PdfViewer
						file={file.file}
						className='h-full'
						renderPageOverlay={renderPdfPageOverlay}
						onPageClick={(e, pageNumber) => handlePdfClick(e, pageNumber, pdfOriginalWidth, pdfOriginalHeight)}
						onPageMouseMove={(e, pageNumber) => handlePdfMouseMove(e, pageNumber, pdfOriginalWidth, pdfOriginalHeight)}
						onPageMouseLeave={handlePdfMouseLeave}
					/>
				) : file.type.startsWith('image/') && pdfUrl ? (
					<div
						className='h-full flex items-center justify-center p-4 overflow-auto relative cursor-pointer'
						onClick={handleImageClick}
						onMouseMove={handleImageMouseMove}
						onMouseLeave={handleImageMouseLeave}>
						<img
							ref={imageRef}
							src={pdfUrl}
							alt={file.name}
							className='max-w-full max-h-full object-contain'
						/>
						{renderImageOverlay()}
					</div>
				) : (
					<div className='h-full flex items-center justify-center text-gray-500'>
						<p>不支持的文件格式</p>
					</div>
				)}
			</div>
		</div>
	)
}
