import { speakerProfile } from "../../../shared/speaker-profile";

export default speakerProfile({
  photos: [{ href: "media/speaker-portrait.jpeg", alt: "Carla Rivera, a carrot character with leafy green hair and round glasses" }],
  logo: { href: "media/speaker-logo.svg", alt: "Kestrel Labs" },
  linkedin: "https://example.com/your-linkedin",
  email: "carla.rivera@example.com",
  web: "example.com/talks",
  statements: 2,
});
