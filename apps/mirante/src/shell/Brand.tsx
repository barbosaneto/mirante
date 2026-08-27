interface BrandProps {
  applicationName: string;
  logoUrl: string;
}

export function Brand({ applicationName, logoUrl }: BrandProps) {
  return (
    <div className="brand" aria-label={applicationName}>
      <img className="brand__logo" src={logoUrl} alt="" />
      <span className="brand__name">{applicationName}</span>
    </div>
  );
}
