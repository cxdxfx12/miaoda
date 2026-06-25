package upload

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	xdraw "golang.org/x/image/draw"
)

const (
	MaxImageSize       = 10 * 1024 * 1024
	DefaultMaxSide     = 1600
	DefaultJPEGQuality = 82
)

var AllowedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
}

type SaveResult struct {
	URL       string
	Size      int64
	Optimized bool
}

func init() {
	image.RegisterFormat("jpeg", "\xff\xd8", jpeg.Decode, jpeg.DecodeConfig)
	image.RegisterFormat("png", "\x89PNG\r\n\x1a\n", png.Decode, png.DecodeConfig)
	image.RegisterFormat("gif", "GIF8?a", gif.Decode, gif.DecodeConfig)
}

// SaveUploadedImage 保存上传图片，并对 JPG/PNG 自动缩放压缩。
func SaveUploadedImage(src io.Reader, originalName string, originalSize int64) (*SaveResult, error) {
	ext := strings.ToLower(filepath.Ext(originalName))
	if !AllowedImageExts[ext] {
		return nil, fmt.Errorf("不支持的文件类型，仅允许 jpg/png/gif/webp")
	}
	if originalSize > MaxImageSize {
		return nil, fmt.Errorf("文件大小不能超过 10MB")
	}

	data, err := io.ReadAll(src)
	if err != nil {
		return nil, fmt.Errorf("读取文件失败")
	}
	dateDir := time.Now().Format("2006/01")
	uploadDir := filepath.Join("public", "uploads", dateDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("创建上传目录失败")
	}

	if ext == ".jpg" || ext == ".jpeg" || ext == ".png" {
		if result, err := saveOptimizedRaster(data, ext, uploadDir, dateDir); err == nil {
			return result, nil
		}
	}
	return saveOriginal(data, ext, uploadDir, dateDir)
}

func saveOriginal(data []byte, ext, uploadDir, dateDir string) (*SaveResult, error) {
	newName := uuid.New().String() + ext
	savePath := filepath.Join(uploadDir, newName)
	if err := os.WriteFile(savePath, data, 0644); err != nil {
		return nil, fmt.Errorf("保存文件失败")
	}
	return &SaveResult{
		URL:       fmt.Sprintf("/uploads/%s/%s", dateDir, newName),
		Size:      int64(len(data)),
		Optimized: false,
	}, nil
}

func saveOptimizedRaster(data []byte, ext, uploadDir, dateDir string) (*SaveResult, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	img = resizeIfNeeded(img, DefaultMaxSide)

	hasAlpha := ext == ".png" && imageHasAlpha(img)
	outExt := ".jpg"
	if hasAlpha {
		outExt = ".png"
	}
	newName := uuid.New().String() + outExt
	savePath := filepath.Join(uploadDir, newName)
	f, err := os.Create(savePath)
	if err != nil {
		return nil, fmt.Errorf("创建文件失败")
	}
	defer f.Close()

	if hasAlpha {
		err = png.Encode(f, img)
	} else {
		err = jpeg.Encode(f, flattenToRGB(img), &jpeg.Options{Quality: DefaultJPEGQuality})
	}
	if err != nil {
		return nil, fmt.Errorf("压缩图片失败")
	}
	info, _ := f.Stat()
	return &SaveResult{
		URL:       fmt.Sprintf("/uploads/%s/%s", dateDir, newName),
		Size:      info.Size(),
		Optimized: true,
	}, nil
}

func resizeIfNeeded(img image.Image, maxSide int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxSide && h <= maxSide {
		return img
	}
	ratio := float64(maxSide) / float64(max(w, h))
	nw := int(float64(w) * ratio)
	nh := int(float64(h) * ratio)
	dst := image.NewNRGBA(image.Rect(0, 0, nw, nh))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)
	return dst
}

func imageHasAlpha(img image.Image) bool {
	b := img.Bounds()
	for y := b.Min.Y; y < b.Max.Y; y++ {
		for x := b.Min.X; x < b.Max.X; x++ {
			_, _, _, a := img.At(x, y).RGBA()
			if a < 0xffff {
				return true
			}
		}
	}
	return false
}

func flattenToRGB(img image.Image) image.Image {
	b := img.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	draw.Draw(dst, dst.Bounds(), img, b.Min, draw.Over)
	return dst
}
