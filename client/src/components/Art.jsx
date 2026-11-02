import { useId } from 'react';

const BODY = 'M673.508,314.502c0,0-24.514,24.514,0,103.502c24.514,78.988,157.977,212.451,108.949,307.782c0,0-23.815,34.933-24.514,19.066c-0.448-10.172,32.85-47.647-19.066-70.817c0,0,10.895,122.568-133.463,152.529c0,0-10.895,21.79-2.724,29.961c8.171,8.171,19.066,8.171,13.619,19.066c0,0-5.447,2.724-13.619,0c0,0-2.724,8.171-13.619,5.448c-10.895-2.724-13.619-5.448-13.619-5.448s5.447,5.448-2.724,5.448c-8.171,0-27.237-2.724-13.619-21.79c13.619-19.066,10.895-35.409,10.895-35.409s-40.856,5.447-70.817-2.724c0,0,0,27.237,8.171,38.132c8.171,10.895,24.514,16.342,13.619,24.514c0,0-10.895,2.724-19.066-2.724c0,0,0,8.171-16.342,5.448c0,0-10.895,0-8.171-5.448c0,0-8.171,10.895-19.066,2.724c-10.895-8.171,13.619-8.171,13.619-27.237c0-2.383,0.459-8.845-5.033-12.145c-147.497-88.633-237.38-295.637,52.178-484.056c2.949-1.919,4.85-5.129,7.329-7.69c0,0,65.37-152.529,141.634-122.568L708.917,211l-35.409,38.132l57.198-2.724l-43.58,21.79C687.127,268.198,689.85,281.817,673.508,314.502z';
const WING = 'M454.98,417.087c0.002-0.349-3.638-80.185,18.611-106.1c22.249-25.915,14.781-35.561-7.086-23.723c-21.867,11.838-76.056,130.006-58.095,183.541L454.98,417.087z';
const BELLY = 'M613.586,382.595c0,0,24.514-21.79,32.685,13.619c8.151,35.321,95.331,160.7,65.37,302.335c-0.153,0.724,3.339,23.617-29.961,70.817c-4.42,6.265-46.303,32.685-73.541,40.856c-24.612,7.384-141.634,10.895-177.043-19.066c-19.616-16.598-133.463-130.739-32.685-269.65c84.738-116.801,131.759-150.252,145.5-160.282c4.305-3.142,11.367-0.409,15.2,2.305c2.427,1.719,6.527,10.33,8.171,13.619C572.73,388.043,597.243,398.938,613.586,382.595z';
const EYE_PATCH = 'M651.718,251.856c0,0-29.961-10.895-43.58,10.895C608.138,262.751,632.652,276.37,651.718,251.856z';
const PUPIL = 'M627.31,258.44c1.196,4.536,3.549,7.847,5.257,7.397c1.708-0.45,2.124-4.492,0.928-9.027c-1.195-4.536-3.549-7.847-5.257-7.397C626.53,249.863,626.115,253.905,627.31,258.44z';

export function Penguin({ height = 100, mirror = false, inverted = false, style }) {
  const dark = inverted ? '#ededed' : '#070707';
  const light = inverted ? '#141414' : '#f3f3f3';
  return (
    <svg
      viewBox="270 150 540 780"
      height={height}
      width={(height * 540) / 780}
      style={{ display: 'block', transform: mirror ? 'scaleX(-1)' : undefined, ...style }}
      aria-hidden="true"
    >
      <path fill={dark} d={BODY} />
      <path fill={dark} d={WING} />
      <path fill={light} d={BELLY} />
      <path fill={light} d={EYE_PATCH} />
      <path fill={dark} d={PUPIL} />
    </svg>
  );
}

export function PenguinPair({ height = 110, inverted = false, gap = 0.2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <Penguin height={height} inverted={inverted} />
      <Penguin height={height * 0.86} mirror inverted={inverted} style={{ marginLeft: -height * gap }} />
    </div>
  );
}

export function GridLines({ color = '#fff', opacity = 0.3 }) {
  return (
    <svg className="grid-lines" viewBox="0 0 240 300" preserveAspectRatio="xMidYMid slice" style={{ color, opacity }} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth=".6">
        <circle cx="120" cy="150" r="40" />
        <circle cx="120" cy="150" r="72" />
        <circle cx="120" cy="150" r="104" />
        <circle cx="120" cy="150" r="136" />
        <path d="M120 0V300M0 150H240M40 0V300M200 0V300M0 60H240M0 240H240" />
      </g>
    </svg>
  );
}

export function ArcTitle({ title, subtitle }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="arc-title" viewBox="0 0 240 130" aria-label={title}>
      <path id={`${id}a`} d="M45 108 A78 78 0 0 1 195 108" fill="none" />
      <path id={`${id}b`} d="M62 112 A62 62 0 0 1 178 112" fill="none" />
      <text fontFamily="Unbounded, sans-serif" fontWeight="400" fontSize="15" fill="#fff" letterSpacing="1">
        <textPath href={`#${id}a`} startOffset="50%" textAnchor="middle">{title}</textPath>
      </text>
      {subtitle && (
        <text fontFamily="Unbounded, sans-serif" fontSize="5.5" fill="#fff" letterSpacing="2.4" opacity=".9">
          <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">{`· ${subtitle.toUpperCase()} ·`}</textPath>
        </text>
      )}
    </svg>
  );
}

export function Ring({ size = 150, percent = 0, color = '#5fa9ee', track = '#e6e6e6', children }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}
