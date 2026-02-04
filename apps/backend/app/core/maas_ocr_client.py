"""
MaaS-based OCR client using GLM-OCR SDK.

This client uses the GlmOcr class from the SDK to directly call the Zhipu MaaS API
instead of connecting to a local Flask server.
"""

import json
import sys
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import asyncio
from threading import Lock

from app.utils.logger import logger

# Add GLM-OCR SDK to Python path (needed for worker threads)
# apps/backend/app/core/maas_ocr_client.py -> GLM-OCR
_glm_ocr_root = Path(__file__).parent.parent.parent.parent.parent
if str(_glm_ocr_root) not in sys.path:
    sys.path.insert(0, str(_glm_ocr_root))


class ServiceRequestError(Exception):
    """服务请求错误"""
    pass


class ServiceResponseError(Exception):
    """服务响应错误"""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"HTTP {status_code}: {message}")


class MaaSOcrClient:
    """MaaS-based OCR client using GLM-OCR SDK.

    This client uses the GlmOcr class to call the Zhipu MaaS API directly.
    It provides the same interface as LayoutAndOCRClient but uses SDK internally.

    响应格式:
        [
            [
                {
                    "index": 0,
                    "label": "text",
                    "bbox_2d": [100, 200, 800, 350],
                    "content": "这是第一段文本内容..."
                },
                ...
            ],
            # 第二张图像的识别结果...
        ]
    """

    _instance = None
    _lock = Lock()

    def __new__(cls, *args, **kwargs):
        """Singleton pattern to ensure only one GlmOcr instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, config_path: Optional[str] = None):
        """初始化MaaS OCR客户端。

        Args:
            config_path: GLM-OCR配置文件路径。如果为None，使用默认配置。
        """
        # Only initialize once
        if hasattr(self, '_initialized') and self._initialized:
            return

        self.config_path = config_path or "/home/guido/zai_test/GLM-OCR/glmocr/config.yaml"
        self._glm_ocr = None
        self._initialized = True

    def _get_glm_ocr(self):
        """获取或创建GlmOcr实例（延迟初始化）。"""
        if self._glm_ocr is None:
            from glmocr import GlmOcr

            logger.info(f"Initializing GLM-OCR SDK with config: {self.config_path}")
            self._glm_ocr = GlmOcr(config_path=self.config_path)
            logger.info("GLM-OCR SDK initialized successfully")
        return self._glm_ocr

    async def process_images(
        self,
        image_paths: Union[str, List[str]],
        prompt: Optional[str] = None,
        custom_url: Optional[str] = None,
    ) -> List[List[Dict[str, Any]]]:
        """处理一张或多张图片，返回layout和OCR结果。

        Args:
            image_paths: 单个图片路径或图片路径列表
            prompt: 自定义提示词（MaaS模式暂不支持）
            custom_url: 自定义服务URL（MaaS模式忽略此参数）

        Returns:
            识别结果列表，每个元素对应一张图片的结果：
            [
                [
                    {
                        "index": 0,
                        "label": "text",
                        "bbox_2d": [100, 200, 800, 350],
                        "content": "文本内容"
                    },
                    ...
                ],
                # 第二张图片的结果...
            ]

        Raises:
            ServiceRequestError: 如果请求失败
        """
        # 统一处理为列表
        if isinstance(image_paths, str):
            image_paths = [image_paths]

        logger.info(f"Processing {len(image_paths)} images with MaaS OCR")

        # 在线程池中运行同步的GlmOcr调用
        loop = asyncio.get_event_loop()
        try:
            results = await loop.run_in_executor(
                None,
                self._process_images_sync,
                image_paths
            )

            # 验证返回格式
            if not isinstance(results, list):
                raise ValueError("响应格式错误：期望返回列表")

            total_blocks = sum(len(img) for img in results)
            logger.info(
                f"Successfully processed {len(image_paths)} images, "
                f"found {total_blocks} blocks total"
            )

            return results

        except Exception as e:
            error_msg = f"MaaS OCR processing failed: {str(e)}"
            logger.error(error_msg)
            raise ServiceRequestError(error_msg)

    def _process_images_sync(self, image_paths: List[str]) -> List[List[Dict[str, Any]]]:
        """同步处理图片（在线程池中运行）。"""
        glm_ocr = self._get_glm_ocr()

        # 处理所有图片
        # return_crop_images=True enables better layout detection and image extraction
        pipeline_results = glm_ocr.parse(
            image_paths,
            save_layout_visualization=False,
            return_crop_images=True
        )

        # 转换为web app期望的格式
        all_results = []
        for result in pipeline_results:
            # result.json_result 已经是正确的格式: [[{index, label, content, bbox_2d}, ...], ...]
            json_result = result.json_result

            # 确保格式正确
            if isinstance(json_result, list):
                if len(json_result) > 0 and isinstance(json_result[0], list):
                    # 已经是 [[{...}, ...], ...] 格式
                    all_results.extend(json_result)
                else:
                    # 是 [{...}, ...] 格式，包装一层
                    all_results.append(json_result)
            else:
                logger.warning(f"Unexpected json_result format: {type(json_result)}")
                all_results.append([])

        return all_results

    async def process_single_image(
        self,
        image_path: str,
        prompt: Optional[str] = None,
        custom_url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """处理单张图片，返回layout和OCR结果。

        Args:
            image_path: 图片文件路径
            prompt: 自定义提示词
            custom_url: 自定义服务URL

        Returns:
            单张图片的识别结果列表
        """
        results = await self.process_images(image_path, prompt, custom_url)
        return results[0] if results else []

    def close(self):
        """关闭OCR客户端并释放资源。"""
        if self._glm_ocr is not None:
            logger.info("Closing GLM-OCR SDK")
            self._glm_ocr.close()
            self._glm_ocr = None

    def __del__(self):
        """析构函数，确保资源被释放。"""
        try:
            self.close()
        except Exception:
            pass


# 创建全局MaaS客户端实例
_maas_client_instance: Optional[MaaSOcrClient] = None
_maas_client_lock = Lock()


def get_maas_client(config_path: Optional[str] = None) -> MaaSOcrClient:
    """获取全局MaaS OCR客户端实例。

    Args:
        config_path: GLM-OCR配置文件路径

    Returns:
        MaaSOcrClient实例
    """
    global _maas_client_instance
    if _maas_client_instance is None:
        with _maas_client_lock:
            if _maas_client_instance is None:
                _maas_client_instance = MaaSOcrClient(config_path=config_path)
    return _maas_client_instance
