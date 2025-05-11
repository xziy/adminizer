
import { resolvePageComponent } from './yourFile'; // replace 'yourFile' with the actual file name

describe('resolvePageComponent', () => {
  const mockPages = {
    '/home': Promise.resolve('Home Component'),
    '/about': () => Promise.resolve('About Component'),
  };

  it('should resolve component when path is a string', async () => {
    const result = await resolvePageComponent('/home', mockPages);
    expect(result).toBe('Home Component');
  });

  it('should resolve component when path is an array of strings', async () => {
    const result = await resolvePageComponent(['/notFound', '/home'], mockPages);
    expect(result).toBe('Home Component');
  });

  it('should resolve component when page is a function', async () => {
    const result = await resolvePageComponent('/about', mockPages);
    expect(result).toBe('About Component');
  });

  it('should throw error when page is not found', async () => {
    expect.assertions(1);
    try {
      await resolvePageComponent('/notFound', mockPages);
    } catch (e) {
      expect(e.message).toBe('Page not found: /notFound');
    }
  });
});



import { titleAppender } from './yourFile'; // replace 'yourFile' with the actual file name

describe('titleAppender', () => {
  const appName = "MyApp";

  it('should append appName to title', () => {
    const result = titleAppender('Home - ', appName);
    expect(result).toBe('Home - MyApp');
  });

  it('should handle empty title', () => {
    const result = titleAppender('', appName);
    expect(result).toBe('MyApp');
  });

  it('should handle null title', () => {
    const result = titleAppender(null, appName);
    expect(result).toBe('nullMyApp');
  });
});



import { resolvePageComponent } from './yourFile'; // replace 'yourFile' with the actual file name
jest.mock('./yourFile');

describe('resolvePageComponentWithName', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call resolvePageComponent with correct arguments', async () => {
    const mockImportMeta = {
      glob: jest.fn().mockReturnValue({
        './pages/Home.tsx': Promise.resolve('Home Component'),
      }),
    };

    await resolvePageComponent('Home', mockImportMeta);

    expect(resolvePageComponent).toHaveBeenCalledWith(
      './pages/Home.tsx',
      mockImportMeta.glob('./pages/**/*.tsx')
    );
  });

  it('should throw error when page is not found', async () => {
    const mockImportMeta = {
      glob: jest.fn().mockReturnValue({}),
    };

    expect.assertions(1);
    try {
      await resolvePageComponent('NotFound', mockImportMeta);
    } catch (e) {
      expect(e.message).toBe('Page not found: ./pages/NotFound.tsx');
    }
  });
});



import { setup } from './yourFile'; // replace 'yourFile' with the actual file name
import { screen } from '@testing-library/react';
import ReactDOM from 'react-dom';

jest.mock('react-dom', () => ({
  createRoot: jest.fn().mockImplementation(() => ({ render: jest.fn() })),
}));

describe('setup', () => {
  const mockEl = document.createElement('div');
  const mockApp = () => <div data-testid="mock-app">Mock App</div>;
  const mockProps = { prop1: 'value1', prop2: 'value2' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call createRoot with correct arguments', () => {
    setup({
      el: mockEl,
      App: mockApp,
      props: mockProps,
    });

    expect(ReactDOM.createRoot).toHaveBeenCalledWith(mockEl);
  });

  it('should call render with correct arguments', () => {
    setup({
      el: mockEl,
      App: mockApp,
      props: mockProps,
    });

    const renderCallArgs = ReactDOM.createRoot().render.mock.calls[0][0];
    const container = document.createElement('div');
    ReactDOM.render(renderCallArgs, container);

    expect(screen.getByTestId('mock-app')).toBeInTheDocument();
  });
});
