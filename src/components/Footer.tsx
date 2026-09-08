import { useSite } from '../context/SiteContext'

export function Footer() {
  const site = useSite()
  const year = new Date().getFullYear()
  const hospital = site.hospital

  return (
    <footer className="footer">
      <div className="footer__top">
        <div>
          <div className="footer__brand footer__brand--script">{hospital.englishName}</div>
          <p className="footer__copy">
            {hospital.address}
            <br />
            {hospital.addressEn}
          </p>
          <a className="footer__mail" href={`mailto:${hospital.email}`}>
            {hospital.email}
          </a>
        </div>

        <div className="footer__links">
          <div className="footer__col">
            <h4>Media</h4>
            <ul>
              <li>
                <a href={hospital.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
              </li>
              <li>
                <a href={hospital.line} target="_blank" rel="noopener noreferrer">
                  Line
                </a>
              </li>
              <li>
                <a href={hospital.tiktok} target="_blank" rel="noopener noreferrer">
                  TikTok
                </a>
              </li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Contact Us</h4>
            <ul>
              <li>
                <a href={hospital.phoneHref}>Phone: {hospital.phone}</a>
              </li>
              <li>
                <a href={hospital.faxHref}>Fax: {hospital.fax}</a>
              </li>
              <li>
                <a href={hospital.website} target="_blank" rel="noopener noreferrer">
                  Visit Our Website
                </a>
              </li>
              <li>
                <a href={hospital.maps} target="_blank" rel="noopener noreferrer">
                  Location
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p>© Copyright {year} CHAIPRAKAN HOSPITAL.</p>
      </div>
    </footer>
  )
}
