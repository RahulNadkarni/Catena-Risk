interface Props {
  lat: number;
  lng: number;
  driverName: string;
}

export function DriverMap({ lat, lng, driverName }: Props) {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;

  if (googleKey) {
    const src = `https://www.google.com/maps/embed/v1/place?key=${googleKey}&q=${lat},${lng}&zoom=14`;
    return (
      <iframe
        title={`${driverName} location`}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  // OpenStreetMap embed — no API key required
  const delta = 0.012;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <iframe
      title={`${driverName} location`}
      src={src}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
    />
  );
}
