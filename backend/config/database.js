/**
 * F-TECH-Student-Hub Database Configuration & Initializer
 * Company: F-TECH
 * Founder & Owner: Aditya Kumar Sharma
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '..', '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH 
  ? path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH)
  : path.join(dbDir, 'student_hub.db');

const db = new DatabaseSync(dbPath);

// Execute schema
const schemaFile = path.join(dbDir, 'schema.sql');
if (fs.existsSync(schemaFile)) {
  const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
  db.exec(schemaSQL);
}

// Seed Initial Data if empty
function seedDatabase() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM subjects').get();
  if (countRow.count === 0) {
    console.log('[F-TECH-Student-Hub] Seeding initial academic database...');

    // 1. Subjects
    const insertSubject = db.prepare(`
      INSERT INTO subjects (code, title, branch, semester, credits, description, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const subjects = [
      ['KCS-301', 'Data Structures & Algorithms', 'CSE', 3, 4, 'Linear & non-linear structures, Trees, Graphs, Sorting & Searching, Dynamic Programming.', 'binary'],
      ['KCS-401', 'Operating Systems', 'CSE', 4, 4, 'Process management, concurrency, deadlock, virtual memory, paging and file systems.', 'cpu'],
      ['KCS-302', 'Computer Organization & Architecture', 'CSE', 3, 4, 'Instruction sets, ALU design, memory hierarchy, pipelining, and cache memory.', 'layers'],
      ['KCS-303', 'Discrete Mathematics', 'CSE', 3, 4, 'Set theory, relations, recurrence relations, graph theory, propositional logic.', 'git-merge'],
      ['BAS-103', 'Engineering Mathematics I', 'Common', 1, 4, 'Differential calculus, Matrices, Multiple integrals, Vector calculus.', 'calculator'],
      ['KCS-501', 'Database Management Systems', 'CSE', 5, 4, 'Relational models, SQL, ER diagrams, Normalization, indexing, ACID transactions.', 'database'],
      ['KCS-502', 'Design & Analysis of Algorithms', 'CSE', 5, 4, 'Divide & Conquer, Greedy method, Dynamic Programming, NP-completeness.', 'workflow'],
      ['KCS-503', 'Web Technology', 'CSE', 5, 3, 'HTML5, CSS3, Modern JS, Node.js, Express, REST APIs, Session management.', 'globe'],
      ['KCS-601', 'Compiler Design', 'CSE', 6, 4, 'Lexical analysis, syntax parsers, intermediate code generation, code optimization.', 'terminal'],
      ['KCS-701', 'Artificial Intelligence & ML', 'CSE', 7, 4, 'Search algorithms, Knowledge representation, neural nets, regression, ML pipelines.', 'sparkles']
    ];

    for (const sub of subjects) {
      insertSubject.run(...sub);
    }

    // 2. Sample Documents (PYQs & Notes)
    const insertDoc = db.prepare(`
      INSERT INTO documents (title, type, subject_code, semester, branch, unit, year, file_name, author_name, downloads_count, views_count, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const documents = [
      ['AKTU End-Sem Question Paper 2024 (Data Structures KCS-301)', 'aktu-paper', 'KCS-301', 3, 'CSE', 0, 2024, 'aktu-kcs301-2024.pdf', 'F-TECH Examination Archive', 3420, 5810, 4.9],
      ['AKTU End-Sem Question Paper 2023 (Data Structures KCS-301)', 'aktu-paper', 'KCS-301', 3, 'CSE', 0, 2023, 'aktu-kcs301-2023.pdf', 'F-TECH Examination Archive', 2890, 4120, 4.8],
      ['AKTU End-Sem Question Paper 2022 (Data Structures KCS-301)', 'aktu-paper', 'KCS-301', 3, 'CSE', 0, 2022, 'aktu-kcs301-2022.pdf', 'F-TECH Examination Archive', 1940, 3200, 4.7],
      ['AKTU End-Sem Question Paper 2024 (Operating Systems KCS-401)', 'aktu-paper', 'KCS-401', 4, 'CSE', 0, 2024, 'aktu-kcs401-2024.pdf', 'F-TECH Examination Archive', 3150, 4900, 4.9],
      ['AKTU End-Sem Question Paper 2023 (Operating Systems KCS-401)', 'aktu-paper', 'KCS-401', 4, 'CSE', 0, 2023, 'aktu-kcs401-2023.pdf', 'F-TECH Examination Archive', 2410, 3800, 4.8],
      ['AKTU PYQ 2024 (Engineering Mathematics I BAS-103)', 'aktu-paper', 'BAS-103', 1, 'Common', 0, 2024, 'aktu-bas103-2024.pdf', 'F-TECH Examination Archive', 4120, 6890, 4.9],
      ['Data Structures Unit 1-5 Handwritten Topper Notes (Complete)', 'notes', 'KCS-301', 3, 'CSE', 1, null, 'dsa-handwritten-topper-notes.pdf', 'Aditya Kumar Sharma (F-TECH)', 5120, 8920, 5.0],
      ['Operating Systems Process Management & Deadlocks Complete Notes', 'notes', 'KCS-401', 4, 'CSE', 2, null, 'os-unit2-deadlocks-notes.pdf', 'Aditya Kumar Sharma (F-TECH)', 3890, 6140, 4.9],
      ['Engineering Mathematics I Complete Quantum & Formula Book', 'notes', 'BAS-103', 1, 'Common', 1, null, 'maths-1-complete-formula-book.pdf', 'F-TECH Academic Wing', 4890, 7810, 4.9],
      ['DBMS ER-Diagrams, Normalization (1NF to BCNF) & SQL Guide', 'notes', 'KCS-501', 5, 'CSE', 3, null, 'dbms-normalization-guide.pdf', 'Aditya Kumar Sharma (F-TECH)', 3200, 5100, 4.8],
      ['Web Technology REST APIs, Node.js & Authentication Handbook', 'notes', 'KCS-503', 5, 'CSE', 4, null, 'web-tech-modern-handbook.pdf', 'Aditya Kumar Sharma (F-TECH)', 2950, 4600, 5.0],
      ['Design and Analysis of Algorithms - Master Theorem & Dynamic Prog Notes', 'notes', 'KCS-502', 5, 'CSE', 3, null, 'daa-dp-master-theorem.pdf', 'F-TECH Academic Wing', 2700, 4300, 4.8]
    ];

    for (const doc of documents) {
      insertDoc.run(...doc);
    }

    // 3. Lab Experiments
    const insertLab = db.prepare(`
      INSERT INTO lab_experiments (subject_code, exp_no, title, objective, language, code, output_sample, viva_questions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const labs = [
      [
        'KCS-301',
        1,
        'Array Operations - Insertion, Deletion and Traversal',
        'To implement dynamic linear arrays with insertion at index, deletion by value, and linear traversal in C/C++.',
        'C++',
`#include <iostream>
using namespace std;

void display(int arr[], int n) {
    cout << "Array elements: ";
    for (int i = 0; i < n; i++) cout << arr[i] << " ";
    cout << "\\n";
}

int insertElement(int arr[], int n, int element, int capacity, int index) {
    if (n >= capacity) return -1;
    for (int i = n - 1; i >= index; i--) {
        arr[i + 1] = arr[i];
    }
    arr[index] = element;
    return 1;
}

int deleteElement(int arr[], int n, int index) {
    if (index >= n) return -1;
    for (int i = index; i < n - 1; i++) {
        arr[i] = arr[i + 1];
    }
    return 1;
}

int main() {
    int arr[100] = {12, 34, 56, 78, 90};
    int size = 5;
    cout << "--- F-TECH Data Structures Lab: Exp 1 ---\\n";
    display(arr, size);
    insertElement(arr, size, 45, 100, 2);
    size++;
    cout << "After insertion at index 2:\\n";
    display(arr, size);
    deleteElement(arr, size, 4);
    size--;
    cout << "After deletion at index 4:\\n";
    display(arr, size);
    return 0;
}`,
        '--- F-TECH Data Structures Lab: Exp 1 ---\nArray elements: 12 34 56 78 90\nAfter insertion at index 2:\nArray elements: 12 34 45 56 78 90\nAfter deletion at index 4:\nArray elements: 12 34 45 56 90',
        JSON.stringify([
          { q: 'What is the time complexity of insertion in the middle of an array?', a: 'O(n) because elements must be shifted right.' },
          { q: 'What is the difference between Array and Linked List?', a: 'Array provides contiguous memory and O(1) random access; Linked list is non-contiguous with dynamic size.' }
        ])
      ],
      [
        'KCS-301',
        2,
        'Singly Linked List Implementation (CRUD Operations)',
        'Create a singly linked list supporting node insertion at head, tail, and deletion by key.',
        'C++',
`#include <iostream>
using namespace std;

struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(nullptr) {}
};

class LinkedList {
    Node* head;
public:
    LinkedList() : head(nullptr) {}
    void insertAtHead(int val) {
        Node* newNode = new Node(val);
        newNode->next = head;
        head = newNode;
    }
    void insertAtTail(int val) {
        Node* newNode = new Node(val);
        if (!head) { head = newNode; return; }
        Node* temp = head;
        while (temp->next) temp = temp->next;
        temp->next = newNode;
    }
    void printList() {
        Node* temp = head;
        cout << "List: ";
        while (temp) {
            cout << temp->data << " -> ";
            temp = temp->next;
        }
        cout << "NULL\\n";
    }
};

int main() {
    LinkedList list;
    cout << "--- F-TECH Data Structures Lab: Exp 2 ---\\n";
    list.insertAtHead(20);
    list.insertAtHead(10);
    list.insertAtTail(30);
    list.insertAtTail(40);
    list.printList();
    return 0;
}`,
        '--- F-TECH Data Structures Lab: Exp 2 ---\nList: 10 -> 20 -> 30 -> 40 -> NULL',
        JSON.stringify([
          { q: 'Why is Linked List better than array for frequent insertions at beginning?', a: 'Inserting at head takes O(1) time without shifting elements.' }
        ])
      ],
      [
        'KCS-401',
        1,
        'CPU Scheduling - First-Come First-Served (FCFS)',
        'Simulate FCFS process scheduling and compute Average Waiting Time and Turnaround Time.',
        'C++',
`#include <iostream>
#include <vector>
using namespace std;

struct Process {
    int id;
    int bt; // Burst time
    int wt; // Waiting time
    int tat; // Turnaround time
};

int main() {
    cout << "--- F-TECH OS Lab: FCFS CPU Scheduling ---\\n";
    vector<Process> p = {{1, 6}, {2, 8}, {3, 7}, {4, 3}};
    int n = p.size();
    p[0].wt = 0;
    p[0].tat = p[0].bt;

    for (int i = 1; i < n; i++) {
        p[i].wt = p[i - 1].wt + p[i - 1].bt;
        p[i].tat = p[i].wt + p[i].bt;
    }

    float total_wt = 0, total_tat = 0;
    cout << "PID\\tBurst\\tWait\\tTAT\\n";
    for (int i = 0; i < n; i++) {
        total_wt += p[i].wt;
        total_tat += p[i].tat;
        cout << p[i].id << "\\t" << p[i].bt << "\\t" << p[i].wt << "\\t" << p[i].tat << "\\n";
    }
    cout << "\\nAvg Waiting Time: " << (total_wt / n) << " ms\\n";
    cout << "Avg Turnaround Time: " << (total_tat / n) << " ms\\n";
    return 0;
}`,
        '--- F-TECH OS Lab: FCFS CPU Scheduling ---\nPID\tBurst\tWait\tTAT\n1\t6\t0\t6\n2\t8\t6\t14\n3\t7\t14\t21\n4\t3\t21\t24\n\nAvg Waiting Time: 10.25 ms\nAvg Turnaround Time: 16.25 ms',
        JSON.stringify([
          { q: 'What is the Convoy Effect in FCFS?', a: 'When shorter processes wait behind a long CPU-intensive process, deteriorating average waiting time.' }
        ])
      ]
    ];

    for (const lab of labs) {
      insertLab.run(...lab);
    }

    // 4. Community Posts
    const insertPost = db.prepare(`
      INSERT INTO community_posts (author_name, author_badge, title, content, tags, upvotes, views, answers_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const posts = [
      [
        'Rohit Verma',
        '3rd Year CSE',
        'How to score 90+ in AKTU KCS-301 Data Structures End Sem exam?',
        'What are the most repeated 10-mark questions from Unit 3 (Trees) and Unit 4 (Graphs)? Also does step marking apply for C++ pseudocode?',
        'aktu,dsa,exam-tips,kcs301',
        42,
        310,
        3
      ],
      [
        'Priya Singh',
        '2nd Year IT',
        'Where can I find AKTU 2024 revised syllabus quantum solutions for OS?',
        'Looking for genuine solutions for Deadlock Banker algorithm numericals with multiple resources. The F-TECH notes on unit 2 were great, need unit 3 solutions!',
        'aktu,os,quantum,kcs401',
        28,
        195,
        2
      ],
      [
        'Aditya Kumar Sharma',
        'Founder (F-TECH)',
        'Welcome to F-TECH Student-Hub! Share your study notes and get verified badges',
        'Welcome all engineering students across AKTU & affiliated colleges! This platform is built for fast access to high-quality handwritten notes, past papers, lab manuals, and tutorials. Feel free to request any subject material here!',
        'announcement,f-tech,community,welcome',
        105,
        1240,
        14
      ]
    ];

    for (const post of posts) {
      insertPost.run(...post);
    }

    // 5. Default Admin User
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'ftechadmin2026', 10);
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `);
    insertAdmin.run(
      process.env.ADMIN_USERNAME || 'admin',
      hash,
      'Aditya Kumar Sharma',
      'SuperAdmin'
    );

    console.log('[F-TECH-Student-Hub] Seeding completed successfully.');
  }
}

seedDatabase();

module.exports = db;
