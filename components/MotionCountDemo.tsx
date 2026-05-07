'use client'

import { useMemo, useRef, type CSSProperties } from 'react'
import { CountParticleScene } from './CountParticleScene'
import { StatusHud } from './StatusHud'
import { useHandTracking } from '../hooks/useHandTracking'
import type { LandmarkPoint } from '../types'

type MaskPoint = {
  x: number
  y: number
}

function cross(origin: MaskPoint, a: MaskPoint, b: MaskPoint) {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

function getConvexHull(points: MaskPoint[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)

  if (sorted.length <= 1) {
    return sorted
  }

  const lower: MaskPoint[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: MaskPoint[] = []
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

function createHandClipPath(hands: LandmarkPoint[][]) {
  const points = hands
    .filter((hand) => hand.length >= 21)
    .flatMap((hand) =>
      hand.map((point) => ({
        x: point.x * 100,
        y: point.y * 100,
      })),
    )

  if (points.length < 3) {
    return 'circle(0% at 50% 50%)'
  }

  const center = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x / points.length,
      y: acc.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  )
  const expanded = points.map((point) => ({
    x: center.x + (point.x - center.x) * 1.34,
    y: center.y + (point.y - center.y) * 1.44,
  }))
  const hull = getConvexHull(expanded)

  return `polygon(${hull
    .map((point) => `${clampPercent(point.x).toFixed(2)}% ${clampPercent(point.y).toFixed(2)}%`)
    .join(', ')})`
}

export function MotionCountDemo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const tracking = useHandTracking(videoRef)
  const handClipPath = useMemo(() => createHandClipPath(tracking.hands), [tracking.hands])
  const handMaskStyle = useMemo(
    () =>
      ({
        clipPath: handClipPath,
        WebkitClipPath: handClipPath,
      }) as CSSProperties,
    [handClipPath],
  )

  const overlayCopy = useMemo(() => {
    switch (tracking.trackingState) {
      case 'idle':
        return {
          eyebrow: 'Interactive Count',
          title: '손가락 개수가 입자 숫자가 됩니다',
          body: '카메라를 켜고 손을 들어보세요. 펼친 손가락 개수만큼 숫자와 작은 배지가 실시간으로 바뀝니다.',
          action: '카메라 시작',
        }
      case 'requesting_permission':
        return {
          eyebrow: '권한 요청 중',
          title: '브라우저 카메라 권한을 허용해주세요',
          body: '권한이 열리면 손 추적과 3D 입자 숫자 렌더링이 바로 시작됩니다.',
          action: '권한 대기 중',
        }
      case 'denied':
        return {
          eyebrow: '권한 필요',
          title: '카메라 접근이 차단되었습니다',
          body: '주소창 또는 사이트 설정에서 카메라 권한을 허용한 뒤 다시 시도해주세요.',
          action: '다시 시도',
        }
      case 'interrupted':
        return {
          eyebrow: '카메라 연결 끊김',
          title: '실행 중이던 카메라 스트림이 중단되었습니다',
          body:
            tracking.errorMessage ??
            '장치 분리, 브라우저 권한 변경, 다른 앱의 사용 여부를 확인하고 다시 연결해주세요.',
          action: '다시 연결',
        }
      case 'unsupported':
        return {
          eyebrow: '지원되지 않음',
          title: '이 브라우저는 필요한 미디어 API를 지원하지 않습니다',
          body: '최신 데스크톱 Chrome 또는 Chromium 계열 브라우저에서 다시 열어주세요.',
          action: '새로고침',
        }
      case 'error':
        return {
          eyebrow: '실행 오류',
          title: '손 추적 엔진을 시작하지 못했습니다',
          body:
            tracking.errorMessage ??
            '네트워크 상태 또는 브라우저 권한을 확인하고 다시 시도해주세요.',
          action: '다시 시도',
        }
      case 'ready':
      default:
        return null
    }
  }, [tracking.errorMessage, tracking.trackingState])

  return (
    <main
      className="app-shell"
      data-camera-active={tracking.isCameraActive}
      data-hand-visible={tracking.handDetected}
    >
      <video
        ref={videoRef}
        className="camera-capture camera-preview"
        style={handMaskStyle}
        muted
        playsInline
      />
      <div className="app-backdrop" aria-hidden="true" />

      <CountParticleScene countValue={tracking.fingerCount} />

      <section className="scene-overlay">
        <header className="title-lockup">
          <p className="title-lockup__kicker">Motion Count</p>
          <h1>
            <span>손가락 개수가</span>
            <span>입자로 보입니다</span>
          </h1>
          <p className="title-lockup__body">
            지금 감지한 숫자는 {tracking.fingerCount}입니다.
          </p>
        </header>

        <section className="info-dock info-dock--count-only">
          <StatusHud
            modelReady={tracking.modelReady}
            trackingState={tracking.trackingState}
            permissionState={tracking.permissionState}
            streamState={tracking.streamState}
            isCameraActive={tracking.isCameraActive}
            handDetected={tracking.handDetected}
            gesture={tracking.gesture}
            rawDetectionCount={tracking.rawDetectionCount}
            videoResolution={tracking.videoResolution}
            lastInferenceDurationMs={tracking.lastInferenceDurationMs}
            sendCount={tracking.sendCount}
            resultCount={tracking.resultCount}
            debugState={tracking.debugState}
            mode="count"
            fingerCount={tracking.fingerCount}
            countValue={tracking.fingerCount}
            countdownBurst={false}
            energy={tracking.handDetected ? 0.44 : 0}
            swirl={0}
          />

          <section className="gesture-legend" aria-label="카운트 안내">
            <span><strong>한 손</strong> 0부터 5까지</span>
            <span><strong>두 손</strong> 0부터 10까지</span>
          </section>
        </section>
      </section>

      {overlayCopy ? (
        <section className="launch-panel" aria-live="polite">
          <div className="launch-panel__content">
            <p className="launch-panel__eyebrow">{overlayCopy.eyebrow}</p>
            <h2>{overlayCopy.title}</h2>
            <p>{overlayCopy.body}</p>
            <div className="launch-panel__actions">
              <button
                className="launch-button"
                type="button"
                onClick={tracking.start}
                disabled={tracking.trackingState === 'requesting_permission'}
              >
                {overlayCopy.action}
              </button>
              <p className="launch-panel__hint">
                최신 데스크톱 Chrome 권장. 손 영역만 거울모드 영상으로 잘라
                보여주고 손가락 개수를 입자로 변환합니다.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
