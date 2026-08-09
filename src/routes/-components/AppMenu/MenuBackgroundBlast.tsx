import PixelBlast from '../../../ui/pixel-blast';

export const MenuBackgroundBlast = () => {
  return (
    <PixelBlast
      variant="square"
      pixelSize={5}
      color="#72ceff"
      patternScale={3}
      patternDensity={1}
      pixelSizeJitter={0}
      enableRipples
      rippleSpeed={0.4}
      rippleThickness={0.12}
      rippleIntensityScale={1.5}
      liquid={false}
      liquidStrength={0.12}
      liquidRadius={1.2}
      liquidWobbleSpeed={5}
      speed={0.5}
      edgeFade={0.1}
      transparent
    />
  );
};
