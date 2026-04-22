import { of } from 'rxjs';
import { TransformInterceptor } from '../transform.interceptor.js';

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps data in success envelope', (done) => {
    const mockCallHandler = { handle: () => of({ id: '1', name: 'Test' }) };
    const ctx = {} as never;

    interceptor.intercept(ctx, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { id: '1', name: 'Test' },
      });
      done();
    });
  });

  it('wraps null data', (done) => {
    const mockCallHandler = { handle: () => of(null) };

    interceptor.intercept({} as never, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: null });
      done();
    });
  });

  it('wraps array data', (done) => {
    const mockCallHandler = { handle: () => of([1, 2, 3]) };

    interceptor.intercept({} as never, mockCallHandler).subscribe((result) => {
      expect(result).toEqual({ success: true, data: [1, 2, 3] });
      done();
    });
  });
});
