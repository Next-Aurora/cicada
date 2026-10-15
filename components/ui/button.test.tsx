import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "./button"

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("applies variant class", () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole("button", { name: "Secondary" })).toHaveAttribute("data-slot", "button")
  })
})
