export function auditedMutation(db, actor, action, target, details, work) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    const targetId = typeof target === "function" ? target(result) : target;
    db.prepare("INSERT INTO admin_audit (actor_id, actor_name, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(actor.id, actor.name, action, String(targetId ?? ""), JSON.stringify(typeof details === "function" ? details(result) : details), Date.now());
    db.exec("COMMIT");
    return result;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
