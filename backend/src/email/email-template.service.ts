import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { EmailTemplateId } from './email.constants';

@Injectable()
export class EmailTemplateService {
  private readonly log = new Logger(EmailTemplateService.name);
  private readonly cache = new Map<string, string>();

  private templatesDir(): string {
    const candidates = [
      join(__dirname, '..', 'templates', 'emails'),
      join(process.cwd(), 'dist', 'templates', 'emails'),
      join(process.cwd(), 'templates', 'emails'),
    ];
    for (const dir of candidates) {
      if (existsSync(join(dir, 'payment-received.html'))) return dir;
    }
    return candidates[0]!;
  }

  async render(
    template: EmailTemplateId,
    variables: Record<string, string>,
  ): Promise<string> {
    let html = this.cache.get(template);
    if (!html) {
      const path = join(this.templatesDir(), `${template}.html`);
      try {
        html = await readFile(path, 'utf8');
        this.cache.set(template, html);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.log.error(`Failed to load email template ${template}: ${msg}`);
        throw e;
      }
    }
    return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      return variables[key] ?? '';
    });
  }
}
