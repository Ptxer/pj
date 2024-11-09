import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

export async function GET(request) {
  try {
    const sql = `
      SELECT
        patientrecord.patientrecord_id,
        patient.patient_id,
        patient.patient_name,
        patient_type.patienttype_name AS role,
        patientrecord.datetime,
        patientrecord.status,
        patientrecord.other_symptom,
        (SELECT GROUP_CONCAT(symptom.symptom_name ORDER BY symptom.symptom_id)
         FROM symptomrecord
         LEFT JOIN symptom ON symptom.symptom_id = symptomrecord.symptom_id
         WHERE symptomrecord.patientrecord_id = patientrecord.patientrecord_id) AS symptom_names,
        (SELECT GROUP_CONCAT(pillrecord.pillstock_id ORDER BY pillrecord.pillstock_id)
         FROM pillrecord
         WHERE pillrecord.patientrecord_id = patientrecord.patientrecord_id) AS pillstock_ids,
        (SELECT GROUP_CONCAT(pill.pill_name ORDER BY pillrecord.pillstock_id)
         FROM pillrecord
         LEFT JOIN pillstock ON pillrecord.pillstock_id = pillstock.pillstock_id
         LEFT JOIN pill ON pillstock.pill_id = pill.pill_id
         WHERE pillrecord.patientrecord_id = patientrecord.patientrecord_id) AS pill_names,
        (SELECT GROUP_CONCAT(pillrecord.quantity ORDER BY pillrecord.pillstock_id)
         FROM pillrecord
         WHERE pillrecord.patientrecord_id = patientrecord.patientrecord_id) AS pill_quantities
      FROM
        patientrecord
      JOIN
        patient ON patientrecord.patient_id = patient.patient_id
      JOIN
        patient_type ON patient.patienttype_id = patient_type.patienttype_id
      ORDER BY
        patientrecord.datetime DESC;
    `;

    const [rows] = await pool.execute(sql);

    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (err) {
    console.error('Error fetching data:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), { status: 500 });
  }
}