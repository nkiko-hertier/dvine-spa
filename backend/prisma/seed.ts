import { PrismaClient, BookingStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma'

/**
 * Idempotent: safe to run repeatedly (upserts on natural keys). Mirrors the
 * sample data from the base SQL schema, but inserted through Prisma so the
 * fixed `generate_request_reference()` trigger (see migration 002) is
 * exercised properly, including a multi-row-style burst of booking requests
 * — the exact scenario that originally broke.
 */
async function main() {
  const categories = await Promise.all(
    [
      { name: 'Massage Therapy', description: 'Professional massage treatments for relaxation and recovery', coverImageUrl: '/images/categories/massage.jpg', displayOrder: 1 },
      { name: 'Body Treatments', description: 'Exfoliation, wrapping, and skin nourishment services', coverImageUrl: '/images/categories/body.jpg', displayOrder: 2 },
      { name: 'Heat Therapy', description: 'Sauna and heat-based relaxation therapies', coverImageUrl: '/images/categories/heat.jpg', displayOrder: 3 },
      { name: 'Specialty Services', description: 'Unique treatments combining multiple techniques', coverImageUrl: '/images/categories/specialty.jpg', displayOrder: 4 },
    ].map((c) => prisma.category.upsert({ where: { name: c.name }, update: c, create: c })),
  );

  const byName = (name: string) => categories.find((c) => c.name === name)!.id;

  const treatments = [
    { categoryId: byName('Massage Therapy'), name: 'Deep Tissue Massage', description: 'A deeper massage experience designed to help relieve muscle tension and support relaxation.', durationMinutes: 60, price: 30000, imageUrl: '/images/deep-tissue.jpg', benefits: ['Relieves muscle tension', 'Improves circulation', 'Reduces stress', 'Speeds recovery'], recommendedFor: ['Muscle tension', 'Physical fatigue', 'Regular exercisers', 'Deeper pressure seekers'], displayOrder: 1 },
    { categoryId: byName('Massage Therapy'), name: 'Relaxation Massage', description: 'Gentle, flowing strokes to calm your nervous system and promote deep relaxation.', durationMinutes: 50, price: 25000, imageUrl: '/images/relaxation.jpg', benefits: ['Reduces anxiety', 'Lowers blood pressure', 'Improves sleep', 'Relaxes muscles'], recommendedFor: ['Stress relief', 'First-time clients', 'Gentle pressure preference'], displayOrder: 2 },
    { categoryId: byName('Massage Therapy'), name: 'Hot Stone Massage', description: 'Warm basalt stones combined with massage to melt away tension and promote deep relaxation.', durationMinutes: 75, price: 40000, imageUrl: '/images/hot-stone.jpg', benefits: ['Deep muscle relaxation', 'Improves blood flow', 'Reduces anxiety', 'Alleviates chronic pain'], recommendedFor: ['Chronic pain', 'Stress', 'Muscle stiffness', 'Luxury seekers'], displayOrder: 3 },
    { categoryId: byName('Body Treatments'), name: 'Body Scrub & Wrap', description: 'Exfoliate and nourish your skin with natural ingredients, leaving you refreshed and glowing.', durationMinutes: 75, price: 35000, imageUrl: '/images/body-scrub.jpg', benefits: ['Removes dead skin cells', 'Improves skin texture', 'Detoxifies body', 'Hydrates skin'], recommendedFor: ['Dry skin', 'Dull complexion', 'Special occasions', 'Detox seekers'], displayOrder: 1 },
    { categoryId: byName('Heat Therapy'), name: 'Sauna Session', description: 'Deep detoxification and relaxation in our traditional Finnish-style sauna.', durationMinutes: 30, price: 15000, imageUrl: '/images/sauna.jpg', benefits: ['Detoxifies body', 'Improves circulation', 'Relieves muscle pain', 'Boosts immune system'], recommendedFor: ['Post-workout recovery', 'Detox', 'Stress relief'], displayOrder: 1 },
  ];

  for (const t of treatments) {
    await prisma.treatment.upsert({ where: { name: t.name }, update: t, create: t });
  }

  const customers = await Promise.all(
    [
      { fullName: 'Sarah Mucyo', phoneNumber: '+250788999999', whatsappNumber: '+250788999999', source: 'instagram' as const, notes: 'First-time customer, interested in deep tissue' },
      { fullName: 'Jean-Pierre Habimana', phoneNumber: '+250788888888', source: 'referral' as const, notes: 'Referred by Sarah M. Prefers morning appointments' },
      { fullName: 'Claudine Uwimana', phoneNumber: '+250788777777', whatsappNumber: '+250788777777', source: 'website' as const, notes: 'Found us through Google search' },
    ].map((c) => prisma.customer.upsert({ where: { phoneNumber: c.phoneNumber }, update: c, create: c })),
  );

  const deepTissue = await prisma.treatment.findUniqueOrThrow({ where: { name: 'Deep Tissue Massage' } });
  const relaxation = await prisma.treatment.findUniqueOrThrow({ where: { name: 'Relaxation Massage' } });
  const hotStone = await prisma.treatment.findUniqueOrThrow({ where: { name: 'Hot Stone Massage' } });

  // Deliberately fire these concurrently — this is the scenario that broke
  // the original trigger (same-year, near-simultaneous inserts). If this
  // seed script completes without a unique-constraint or cast error, the
  // request_reference fix in migration 002 is doing its job.
  await Promise.all([
    prisma.bookingRequest.create({
      data: { customerId: customers[0]!.id, treatmentId: deepTissue.id, preferredDate: new Date(Date.now() + 3 * 86400000), preferredTime: new Date('1970-01-01T15:00:00Z'), status: BookingStatus.new_request },
    }),
    prisma.bookingRequest.create({
      data: { customerId: customers[1]!.id, treatmentId: relaxation.id, preferredDate: new Date(Date.now() + 2 * 86400000), preferredTime: new Date('1970-01-01T10:00:00Z'), status: BookingStatus.contacted, staffNotes: 'Called customer, waiting for confirmation' },
    }),
    prisma.bookingRequest.create({
      data: { customerId: customers[2]!.id, treatmentId: hotStone.id, preferredDate: new Date(Date.now() + 5 * 86400000), preferredTime: new Date('1970-01-01T14:00:00Z'), status: BookingStatus.confirmed, staffNotes: 'Confirmed via phone.' },
    }),
  ]);

  console.log('Seed complete:', {
    categories: categories.length,
    treatments: treatments.length,
    customers: customers.length,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
