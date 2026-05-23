const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const REPORT_EMAIL = 'zlata.artiukhova@gmail.com';

async function fetchSupabase(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.json();
}

async function sendEmail(subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'OutreachOS <onboarding@resend.dev>',
      to: [REPORT_EMAIL],
      subject,
      html,
    }),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data
    const [projects, donors, contacts, anchors, links] = await Promise.all([
      fetchSupabase('projects', 'select=*'),
      fetchSupabase('donors', 'select=*'),
      fetchSupabase('contacts', 'select=*'),
      fetchSupabase('anchors', 'select=*'),
      fetchSupabase('links', 'select=*'),
    ]);

    // Stats
    const totalDonors = donors.length;
    const newDonors = donors.filter(d => d.created_at >= weekAgo).length;
    const pitched = donors.filter(d => ['pitched', 'replied', 'placed'].includes(d.status)).length;
    const replied = donors.filter(d => ['replied', 'placed'].includes(d.status)).length;
    const placed = donors.filter(d => d.status === 'placed').length;

    const contactsTotal = contacts.length;
    const contactsNew = contacts.filter(c => c.created_at >= weekAgo).length;
    const contactsReplied = contacts.filter(c => c.reply_received).length;
    const contactsPlaced = contacts.filter(c => c.placed).length;
    const contactsFollowup = contacts.filter(c => c.followup_sent).length;

    const anchorsTotal = anchors.length;
    const anchorsUsed = anchors.filter(a => a.status === 'used').length;
    const anchorsInProgress = anchors.filter(a => a.status === 'inprogress').length;
    const anchorsPending = anchors.filter(a => a.status === 'pending').length;

    const linksTotal = links.length;
    const linksAlive = links.filter(l => l.status === 'alive').length;
    const linksDead = links.filter(l => l.status === 'dead').length;
    const linksNofollow = links.filter(l => l.status === 'nofollow').length;
    const linksUnchecked = links.filter(l => l.status === 'not_checked' || !l.status).length;

    // Project progress
    const projectRows = projects.map(p => {
      const pct = Math.round(((p.goal_current || 0) / (p.goal_target || 1)) * 100);
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${p.color};margin-right:8px;"></span>
            <strong>${p.name}</strong>
            ${p.description ? `<br><span style="font-size:12px;color:#94A3B8;">${p.description}</span>` : ''}
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
            <span style="font-size:13px;font-weight:600;color:${p.color};">${p.goal_current || 0} / ${p.goal_target}</span><br>
            <span style="font-size:11px;color:#94A3B8;">${p.goal_label}</span>
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;">
            <div style="font-family:monospace;font-size:12px;color:${p.color};">${bar} ${pct}%</div>
          </td>
        </tr>`;
    }).join('');

    // Dead links warning
    const deadLinksSection = linksDead > 0 ? `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:600;color:#E24B4A;margin-bottom:8px;">⚠️ ${linksDead} dead link${linksDead > 1 ? 's' : ''} detected</div>
        <div style="font-size:13px;color:#64748B;">Check your Link Checker for details and take action.</div>
      </div>` : '';

    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:#fff;border-radius:14px;padding:28px 32px;margin-bottom:16px;border:1px solid #E1E6EF;">
      <div style="font-size:22px;font-weight:700;color:#0A2540;letter-spacing:-0.02em;margin-bottom:4px;">
        Outreach<span style="color:#FF7A59;">OS</span> Weekly Report
      </div>
      <div style="font-size:13px;color:#94A3B8;">${dateStr}</div>
    </div>

    ${deadLinksSection}

    <!-- Donor Discovery -->
    <div style="background:#fff;border-radius:12px;padding:22px 28px;margin-bottom:14px;border:1px solid #E1E6EF;">
      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#FF7A59;margin-bottom:16px;">Donor Discovery</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#F7F8FA;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#0A2540;">${totalDonors}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Total contacts</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FFF3F0;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#FF7A59;">+${newDonors}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">New this week</div>
        </div>
        <div style="text-align:center;padding:14px;background:#EEF2FF;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#4F6EF7;">${pitched}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Pitched</div>
        </div>
        <div style="text-align:center;padding:14px;background:#EDFBF5;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#00A06E;">${placed}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Placed</div>
        </div>
      </div>
    </div>

    <!-- Contact Base -->
    <div style="background:#fff;border-radius:12px;padding:22px 28px;margin-bottom:14px;border:1px solid #E1E6EF;">
      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#C87F0A;margin-bottom:16px;">Contact Base</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#F7F8FA;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#0A2540;">${contactsTotal}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Total</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FFF8EE;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#C87F0A;">${contactsFollowup}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Follow-up sent</div>
        </div>
        <div style="text-align:center;padding:14px;background:#EDFBF5;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#00A06E;">${contactsReplied}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Replied</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F0FDF4;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#16A34A;">${contactsPlaced}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Placed</div>
        </div>
      </div>
    </div>

    <!-- Anchor Plan -->
    <div style="background:#fff;border-radius:12px;padding:22px 28px;margin-bottom:14px;border:1px solid #E1E6EF;">
      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#8B5CF6;margin-bottom:16px;">Anchor Plan</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EDFBF5;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#00A06E;">${anchorsUsed}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Used</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FFF8EE;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#C87F0A;">${anchorsInProgress}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">In progress</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F7F8FA;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#64748B;">${anchorsPending}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Pending</div>
        </div>
      </div>
    </div>

    <!-- Link Checker -->
    <div style="background:#fff;border-radius:12px;padding:22px 28px;margin-bottom:14px;border:1px solid #E1E6EF;">
      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#4F6EF7;margin-bottom:16px;">Link Checker</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        <div style="text-align:center;padding:14px;background:#EDFBF5;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#00A06E;">${linksAlive}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Alive</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FEF2F2;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#E24B4A;">${linksDead}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Dead</div>
        </div>
        <div style="text-align:center;padding:14px;background:#FFF8EE;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#C87F0A;">${linksNofollow}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Nofollow</div>
        </div>
        <div style="text-align:center;padding:14px;background:#F7F8FA;border-radius:10px;">
          <div style="font-size:28px;font-weight:700;color:#94A3B8;">${linksUnchecked}</div>
          <div style="font-size:11px;color:#94A3B8;margin-top:3px;">Not checked</div>
        </div>
      </div>
    </div>

    <!-- Projects -->
    ${projects.length > 0 ? `
    <div style="background:#fff;border-radius:12px;padding:22px 28px;margin-bottom:14px;border:1px solid #E1E6EF;">
      <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#0A2540;margin-bottom:16px;">Projects</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#F7F8FA;">
            <th style="padding:8px 16px;text-align:left;font-size:11px;color:#94A3B8;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Project</th>
            <th style="padding:8px 16px;text-align:center;font-size:11px;color:#94A3B8;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Progress</th>
            <th style="padding:8px 16px;text-align:left;font-size:11px;color:#94A3B8;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Bar</th>
          </tr>
        </thead>
        <tbody>${projectRows}</tbody>
      </table>
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#94A3B8;font-size:12px;">
      OutreachOS · Sent automatically · <a href="https://outreachos-three.vercel.app" style="color:#FF7A59;">Open app →</a>
    </div>
  </div>
</body>
</html>`;

    const emailResult = await sendEmail(
      `OutreachOS Weekly Report — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html
    );

    if (emailResult.id) {
      return res.status(200).json({ success: true, emailId: emailResult.id });
    } else {
      return res.status(500).json({ error: 'Email failed', details: emailResult });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}