interface PagePlaceholderProps {
  title: string
  description: string
}

// Temporary scaffold page — replaced as each feature screen is built out.
export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">{title}</h1>
      </header>
      <p className="page__placeholder">{description}</p>
    </div>
  )
}
