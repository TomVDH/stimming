
float terrH(vec2 p) {
  // Flat round the mount and round the eye, so the ground under the gun reads level.
  float k = smoothstep(900.0, 2400.0, length(p - vec2(0.0, 90.0))) * smoothstep(1500.0, 4000.0, length(p - vec2(1670.0, 1990.0)));
  // The foreground rolls in low swells between the eyes and the gun.
  // The two eyes (wide and portrait) and the plinth stay level.
  float fg = smoothstep(600.0, 1300.0, length(p - vec2(0.0, 90.0))) * smoothstep(150.0, 650.0, length(p - vec2(1670.0, 1990.0))) * smoothstep(150.0, 650.0, length(p - vec2(800.0, 3000.0)));
  // Every view's eye stands on level ground: no swell rises in front of it.
  float dEye = length(p - cameraPosition.xz), eyeK = smoothstep(150.0, 650.0, dEye), eyeF = smoothstep(2000.0, 7000.0, dEye);
  // Crests stay under the eye's line to the gun's foot.
  float roll = fg * (8.0 * sin(p.x * 0.0033 + 1.4 * sin(p.y * 0.0019)) + 6.0 * sin(p.y * 0.0041 + 0.8 * sin(p.x * 0.0027)));
  // Far out, long sweeping swells rise tens of metres.
  float far_ = smoothstep(5000.0, 16000.0, length(p - vec2(1670.0, 1990.0)));
  // Near the eye the sand rolls in gentle waves, one to three metres high.
  // They stay low enough to keep the gun's foot in view.
  // The ground under the eye and round the mount stays level.
  float nk = smoothstep(40.0, 220.0, dEye) * (1.0 - smoothstep(2500.0, 4500.0, dEye)) * smoothstep(450.0, 900.0, length(p - vec2(0.0, 90.0)));
  float amp = mix(0.55, 1.0, smoothstep(200.0, 1400.0, dEye));
  // Long, bent swells, 180 to 300 m apart, so the sand never reads as sea.
  float waves = nk * amp * (2.4 * sin(dot(p, vec2(0.8, 0.6)) * 0.021 + 2.6 * sin(p.y * 0.0047 + 0.9 * sin(p.x * 0.0031)))
    + 1.4 * sin(dot(p, vec2(-0.45, 0.89)) * 0.034 + 2.0 * sin(p.x * 0.0083 + 0.6 * sin(p.y * 0.005))));
  return waves + eyeK * roll + 0.5 * k * (7.0 * sin(p.x * 0.0009 + 1.3 * sin(p.y * 0.0006)) + 5.0 * sin(p.y * 0.0013 + 0.9 * sin(p.x * 0.0007)) + 2.5 * sin((p.x + p.y) * 0.0021))
    + eyeF * far_ * (45.0 * sin(p.x * 0.00031 + 1.7 * sin(p.y * 0.00022)) + 30.0 * sin(p.y * 0.00047 + p.x * 0.00012));
}