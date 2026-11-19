import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'home' | 'paw' | 'calendar' | 'settings' | 'plus' | 'syringe' | 'bell' | 'stethoscope' | 'check' | 'document';

export interface IconProps {
  name: IconName;
  size?: number;
  color: ColorValue;
}

/** Stroke icons drawn on a 24x24 grid. */
export function Icon({ name, size = 24, color }: IconProps) {
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {name === 'home' && <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" {...stroke} />}
      {name === 'paw' && (
        <>
          <Circle cx={6} cy={9} r={2} {...stroke} />
          <Circle cx={10} cy={5} r={2} {...stroke} />
          <Circle cx={14} cy={5} r={2} {...stroke} />
          <Circle cx={18} cy={9} r={2} {...stroke} />
          <Path d="M12 11c-3 0-6 3.5-6 6.2 0 1.8 1.4 2.8 3 2.8 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 3-1 3-2.8C18 14.5 15 11 12 11z" {...stroke} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={3} {...stroke} />
          <Path d="M4 10h16M9 3v4M15 3v4" {...stroke} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...stroke} />
          <Path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" {...stroke} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.6} />}
      {name === 'syringe' && <Path d="M18 2l4 4M15 5l4 4M17 7l-9.5 9.5M6 12l6 6M3 21l3.5-3.5M9 9l-3 3 6 6 3-3" {...stroke} />}
      {name === 'bell' && <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" {...stroke} />}
      {name === 'stethoscope' && <Path d="M6 3v6a5 5 0 0 0 10 0V3M11 14v2a4 4 0 0 0 8 0v-2M19 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" {...stroke} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} />}
      {name === 'document' && <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" {...stroke} />}
    </Svg>
  );
}
