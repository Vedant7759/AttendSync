import { Component, DestroyRef, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap, timer } from 'rxjs';

type AttendanceStatus = 'present' | 'absent' | 'late';
type StatusFilter = AttendanceStatus | 'all';

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  section: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  facultyName: string;
}

interface AttendanceRecord {
  _id: string;
  student: Student;
  subject: Subject;
  date: string;
  status: AttendanceStatus;
}

interface Summary {
  totalStudents: number;
  attendanceRecords: number;
  sessions: number;
  presentCount: number;
  studentPercentages: Array<{
    student: Student;
    totalSessions: number;
    percentage: number;
  }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = 'http://localhost:5000/api';

  records: AttendanceRecord[] = [];
  subjects: Subject[] = [];
  summary: Summary | null = null;
  statusFilter: StatusFilter = 'all';
  recordsLoading = true;
  summaryLoading = true;
  subjectsLoading = true;
  recordsError = '';
  summaryError = '';
  subjectsError = '';
  message = '';
  updatingId = '';

  constructor() {
    this.http.get<Subject[]>(`${this.api}/subjects`).pipe(
      tap((items) => { this.subjects = items; this.subjectsLoading = false; }),
      catchError((error: unknown) => {
        this.subjectsError = this.errorMessage(error);
        this.subjectsLoading = false;
        return of([]);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    timer(0, 3000).pipe(
      switchMap(() => this.http.get<AttendanceRecord[]>(`${this.api}/attendance`).pipe(
        tap((items) => {
          this.records = items;
          this.recordsLoading = false;
          this.recordsError = '';
        }),
        catchError((error: unknown) => {
          this.recordsError = this.errorMessage(error);
          this.recordsLoading = false;
          return of(this.records);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();

    timer(0, 6000).pipe(
      switchMap(() => this.http.get<Summary>(`${this.api}/reports/summary`).pipe(
        tap((result) => {
          this.summary = result;
          this.summaryLoading = false;
          this.summaryError = '';
        }),
        catchError((error: unknown) => {
          this.summaryError = this.errorMessage(error);
          this.summaryLoading = false;
          return of(this.summary);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  get filteredRecords(): AttendanceRecord[] {
    return this.statusFilter === 'all'
      ? this.records
      : this.records.filter((record) => record.status === this.statusFilter);
  }

  setFilter(value: string): void {
    if (value === 'all' || value === 'present' || value === 'absent' || value === 'late') {
      this.statusFilter = value;
    }
  }

  onStatusChange(record: AttendanceRecord, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const value = target.value;
    if (value === 'present' || value === 'absent' || value === 'late') {
      this.updateStatus(record, value, target);
    }
  }

  updateStatus(record: AttendanceRecord, status: AttendanceStatus, select: HTMLSelectElement): void {
    if (record.status === status || this.updatingId) return;
    this.updatingId = record._id;
    this.message = '';
    this.recordsError = '';
    this.http.patch<AttendanceRecord>(`${this.api}/attendance/${record._id}`, { status }).pipe(
      tap((updated) => {
        this.records = this.records.map((item) => item._id === updated._id ? updated : item);
        this.message = `${updated.student.name}'s attendance was updated to ${status}.`;
        this.updatingId = '';
      }),
      catchError((error: unknown) => {
        this.recordsError = this.errorMessage(error);
        this.updatingId = '';
        select.value = record.status;
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe();
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Cannot reach the API. Start the backend and confirm MongoDB is running.';
      const body = error.error as { error?: string } | null;
      return body?.error || `The API returned HTTP ${error.status}.`;
    }
    return 'An unexpected error occurred while loading dashboard data.';
  }
}
