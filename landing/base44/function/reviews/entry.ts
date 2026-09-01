// Public treatment reviews for the D'Vine Spa website.
// The site is public (no login), so anonymous visitors read and submit reviews
// through this bounded, validated service-role endpoint.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function errResponse(status, code, message) {
  return Response.json({ success: false, error: { code, message } }, { status });
}

function aggregateOf(list) {
  if (!list || !list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return { avg: Math.round((sum / list.length) * 10) / 10, count: list.length };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const op = payload.op;

    if (op === 'list') {
      const filter = payload.treatment_id ? { treatment_id: payload.treatment_id } : {};
      const reviews = await base44.asServiceRole.entities.Review.filter(
        filter,
        '-created_date',
        100
      );
      return Response.json({ success: true, reviews, aggregate: aggregateOf(reviews) });
    }

    if (op === 'create') {
      const errs = [];
      if (!payload.treatment_id || (!isUuid(payload.treatment_id) && payload.treatment_id !== 'general')) {
        errs.push('Invalid treatment identifier.');
      }
      if (typeof payload.treatment_name !== 'string' || payload.treatment_name.length > 200) {
        errs.push('Invalid treatment name.');
      }
      if (typeof payload.customer_name !== 'string' || !payload.customer_name.trim() || payload.customer_name.length > 80) {
        errs.push('Please enter your name (max 80 characters).');
      }
      const rating = Number(payload.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errs.push('Rating must be between 1 and 5.');
      }
      const comment = (payload.comment || '').toString().trim();
      if (!comment || comment.length > 2000) {
        errs.push('Please provide a comment (max 2000 characters).');
      }

      if (errs.length > 0) {
        return errResponse(400, 'VALIDATION_ERROR', errs.join(' '));
      }

      const review = await base44.asServiceRole.entities.Review.create({
        treatment_id: payload.treatment_id,
        treatment_name: payload.treatment_name.trim(),
        customer_name: payload.customer_name.trim(),
        rating,
        comment,
      });

      return Response.json({ success: true, review });
    }

    return errResponse(400, 'VALIDATION_ERROR', 'Invalid or missing op');
  } catch (error) {
    return errResponse(500, 'INTERNAL_ERROR', error.message || 'Failed to process reviews request');
  }
}