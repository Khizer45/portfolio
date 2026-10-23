"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { buttonClasses } from "@/components/ui/button";

const TOPICS = ["Job opportunity", "Internship", "Freelance project", "Question about a project", "Other"] as const;

const inputClasses =
  "w-full border-0 border-b border-line-strong bg-transparent px-0 py-2.5 text-base text-fg placeholder:text-fg-subtle/70 transition-[border-color,box-shadow] outline-none focus:border-accent focus:shadow-[0_1px_0_0_var(--accent)] focus-visible:outline-none";

/**
 * There is no mail server: the form composes a message and opens the visitor's own email
 * app with it, so nothing is stored or sent by this site.
 */
export function ContactForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const subject = `${topic} — ${name.trim()}`;
    const body = `${message.trim()}\n\n— ${name.trim()}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-semibold text-fg">
            Your name
          </label>
          <input
            id="contact-name"
            required
            maxLength={100}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClasses}
            placeholder="e.g. Sara Ahmed"
          />
        </div>
        <div>
          <label htmlFor="contact-topic" className="block text-sm font-semibold text-fg">
            Topic
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
              className={`${inputClasses} [&>option]:bg-surface`}
          >
            {TOPICS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-semibold text-fg">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          maxLength={3000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${inputClasses} resize-y`}
          placeholder="Tell me about the role or project…"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id="contact-note" className="text-sm text-fg-subtle">
          Opens your email app with this message ready to send.
        </p>
        <button type="submit" aria-describedby="contact-note" className={buttonClasses({ className: "sm:shrink-0" })}>
          <Send aria-hidden="true" className="group-hover/button:translate-x-0.5" /> Send message
        </button>
      </div>
      <p role="status" className="text-sm text-fg-muted">
        {opened && (
          <>
            Didn&apos;t open? Email me directly at{" "}
            <a href={`mailto:${email}`} className="font-medium text-accent hover:underline">
              {email}
            </a>
            .
          </>
        )}
      </p>
    </form>
  );
}
