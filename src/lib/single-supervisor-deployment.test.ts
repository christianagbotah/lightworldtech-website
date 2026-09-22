import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('single production supervisor deployment', () => {
  test('systemd web service runs as the verified application user', () => {
    const unit = source('ops/lightworldtech-app.service');

    expect(unit).toContain('User=lightworld');
    expect(unit).toContain('Group=lightworld');
    expect(unit).toContain('WorkingDirectory=/home/lightworld/webapps/lightworldtech/.next/standalone');
    expect(unit).toContain('Environment=PORT=3007');
    expect(unit).toContain('Restart=always');
  });

  test('promotion uses transient systemd validation and never starts the web app with PM2', () => {
    const promote = source('ops/promote-release.sh');

    expect(promote).toContain('LIVE_UNIT="lightworldtech-app.service"');
    expect(promote).toContain('CANDIDATE_UNIT="lightworldtech-candidate.service"');
    expect(promote).toContain('systemd-run');
    expect(promote).toContain('systemctl restart "$LIVE_UNIT"');
    expect(promote).toContain('verify_live_listener');
    expect(promote).toContain('Port $PORT is owned by PID');
    expect(promote).toContain('Legacy supervisor $LEGACY_PM2_UNIT is active');
    expect(promote).not.toContain('pm2 start');
    expect(promote).not.toContain('pm2 delete');
  });

  test('installer deploys systemd unit and retires legacy PM2 at boot', () => {
    const installer = source('ops/install-production-ops.sh');

    expect(installer).toContain('lightworldtech-app.service');
    expect(installer).toContain('systemctl enable lightworldtech-app.service');
    expect(installer).toContain('systemctl disable pm2-lightworld.service');
  });

  test('scheduled SMS depends on the canonical systemd web service', () => {
    const smsUnit = source('ops/lightworld-sms-dispatch.service');

    expect(smsUnit).toContain('After=network-online.target lightworldtech-app.service');
    expect(smsUnit).toContain('Wants=network-online.target lightworldtech-app.service');
    expect(smsUnit).not.toContain('pm2-lightworld.service');
  });

  test('production documentation names systemd as the only web supervisor', () => {
    const docs = source('docs/PRODUCTION.md');

    expect(docs).toContain('lightworldtech-app.service');
    expect(docs).toContain('PM2 is not used for the production website');
    expect(docs).toContain('transient systemd candidate');
  });
});
