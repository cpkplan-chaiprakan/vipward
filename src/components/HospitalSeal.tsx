import { site } from '../data/site'

export function HospitalSeal() {
  return (
    <a href={site.hospital.website} target="_blank" rel="noreferrer" className="hero__seal reveal" title={site.hospital.name}>
      <span className="hero__seal-ring">
        <span className="hero__seal-disc">
          <img src={`${import.meta.env.BASE_URL}logo68.jpg`} alt={`โลโก้${site.hospital.name}`} />
        </span>
      </span>
    </a>
  )
}
