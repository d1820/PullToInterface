import { Position, Selection, Uri } from 'vscode';
import { getClassName, getCurrentLine, getInheritedNames, getNamespace, getFullSignatureOfLine, isMethod, isPublicLine, isTerminating, getMethodSignatureText, getPropertySignatureText, SignatureType, getLineEnding, getUsingStatements, replaceUsingStatementsFromText, getUsingStatementsFromText, getMemberName } from './csharp-util';

import * as vscodeMock from 'jest-mock-vscode';
import { MockTextEditor } from 'jest-mock-vscode/dist/vscode';
import { testFile } from '../test/test-class';


describe('CSharp Util', () => {

  describe('getNamespace', () => {
    it('should return the namespace', () => {
      // Arrange
      const windowMock = {
        showErrorMessage: jest.fn()
      };
      const text = `namespace Test
    {
    }`;

      // Act
      const name = getNamespace(text, windowMock as any);

      // Assert
      expect(name).toBe('Test');
      expect(windowMock.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should return null and an error message if the namespace in the file is not found', () => {
      // Arrange
      const windowMock = {
        showErrorMessage: jest.fn()
      };
      const text = 'foo bar';

      // Act
      const name = getNamespace(text, windowMock as any);

      // Assert
      expect(name).toBe(null);
      expect(windowMock.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('getClassName', () => {

    it('should return the name of the class in the file', () => {
      // Arrange
      const windowMock = {
        showErrorMessage: jest.fn()
      };
      const text = `namespace Test
    {
        public class TestModel
        {
            public string StringTest { get; set; }
        }
    }`;

      // Act
      const name = getClassName(text, windowMock as any);

      // Assert
      expect(name).toBe('TestModel');
      expect(windowMock.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should return the name of the class in the file in an abstract class', () => {
      // Arrange
      const windowMock = {
        showErrorMessage: jest.fn()
      };
      const text = `namespace Test
    {
        public abstract class TestModel
        {
            public string StringTest { get; set; }
        }
    }`;

      // Act
      const name = getClassName(text, windowMock as any);

      // Assert
      expect(name).toBe('TestModel');
      expect(windowMock.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should return null and an error message if the model name in the file is not found', () => {
      // Arrange
      const windowMock = {
        showErrorMessage: jest.fn()
      };
      const text = 'foo bar';

      // Act
      const name = getClassName(text, windowMock as any);

      // Assert
      expect(name).toBe(null);
      expect(windowMock.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('getMemberName', () => {

    it('should return the name of the property member in the file when property has generic', () => {

      const text = 'public MyClass<string, int> StringTest { get; set; }';

      // Act
      const name = getMemberName(text);

      // Assert
      expect(name).toBe('StringTest');
    });

    it('should return the name of the property member in the file when property has tuple', () => {

      const text = 'public (street: string, name: string) StringTest { get; set; }';

      // Act
      const name = getMemberName(text);

      // Assert
      expect(name).toBe('StringTest');
    });

    it('should return the name of the method member in the file', () => {

      const text = 'public Task<int> StringTest()';

      // Act
      const name = getMemberName(text);

      // Assert
      expect(name).toBe('StringTest');
    });

    it('should return the name of the method member in the file when no accessor is given', () => {

      const text = 'Task<int> StringTest()';

      // Act
      const name = getMemberName(text);

      // Assert
      expect(name).toBe('StringTest');
    });

    it('should return undefined if the member name in the file is not found', () => {
      // Arrange
      const text = 'foo bar';

      // Act
      const name = getMemberName(text);

      // Assert
      expect(name).toBe(undefined);
    });
  });

  describe('getInheritedNames', () => {
    it('should return the base class and interfaces in the file when parameter includeBaseClasses is true', () => {

      const text = `namespace Test
      {
          public class MyClass<TType> : BaseClass, IMyClass, IMyTypedClass<string> where TType : class
          {
          }
      }`;

      // Act
      const name = getInheritedNames(text, true);

      // Assert
      expect(name).toEqual(['BaseClass', 'IMyClass', 'IMyTypedClass']);
    });

    it('should return the interfaces only in the file when parameter includeBaseClasses is false', () => {

      const text = `namespace Test
      {
          public class MyClass<TType> : BaseClass, IMyClass, IMyTypedClass<string> where TType : class
          {
          }
      }`;

      // Act
      const name = getInheritedNames(text, false);

      // Assert
      expect(name).toEqual(['IMyClass', 'IMyTypedClass']);
    });

    it('should return [] and an error message if the model name in the file is not found', () => {

      const text = 'foo bar';

      // Act
      const name = getInheritedNames(text, true);

      // Assert
      expect(name).toEqual([]);
    });

    it('should return the base class interfaces in the file weird scenario', () => {

      const text = `using System;
      using System.Collections.Generic;
      using System.Linq;
      using System.Threading.Tasks;

      namespace Sample
      {
          public class BaseClass : IBaseClass
          {

          }
      }
      `;

      // Act
      const name = getInheritedNames(text, true);

      // Assert
      expect(name).toEqual(['IBaseClass']);
    });

    it('should return the base class interfaces in the file weird scenario 2', () => {

      const text = `using System;
      using System.Collections.Generic;
      using System.Linq;
      using System.Threading.Tasks;

      namespace Sample
      {
          public class BaseClass : IBaseClass
          {

          }
      }
      `;

      // Act
      const name = getInheritedNames(text, true);

      // Assert
      expect(name).toEqual(['IBaseClass']);
    });
  });

  describe('isMethod', () => {
    it('should return false when signature missing', () => {
      // Act
      const result = isMethod(null);

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return true when valid method signature found', () => {
      const text = `public Task<int> GetNewIdAsync<TNewType>(string name,
        string address,
        string city,
        string state) where TNewType : TType
{`;

      // Act
      const result = isMethod(text);

      // Assert
      expect(result).toBeTruthy();
    });
  });

  describe('isPublicLine', () => {
    it('should return false when text does not contain "public"', () => {
      // Act
      const result = isPublicLine("nomatch");

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return true when text contains "public"', () => {
      const text = `public Task<int> GetNewIdAsync<TNewType>()`;

      // Act
      const result = isPublicLine(text);

      // Assert
      expect(result).toBeTruthy();
    });
  });

  describe('isTerminating', () => {
    it('should return false when text does contain "public"', () => {
      // Act
      const result = isTerminating("public Task<int> GetNewIdAsync<TNewType>()");

      // Assert
      expect(result).toBeFalsy();
    });

    it('should return true when text contains "protected"', () => {
      const text = `protected Task<int> GetNewIdAsync<TNewType>()`;

      // Act
      const result = isTerminating(text);

      // Assert
      expect(result).toBeTruthy();
    });

    it('should return true when text contains ""', () => {
      const text = "";

      // Act
      const result = isTerminating(text);

      // Assert
      expect(result).toBeTruthy();
    });

    it('should return true when text contains newline', () => {
      const text = `
      `;

      // Act
      const result = isTerminating(text);

      // Assert
      expect(result).toBeTruthy();
    });
  });

  describe('getCurrentLine', () => {
    it('should return current line where cursor is positioned', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(7, 0)));

      const result = getCurrentLine(editor);

      // Assert
      expect(result).toEqual('public class MyClass<TType> : BaseClass, IMyClass, IMyTypedClass<string> where TType : class');
    });

    it('should return null when no editor active', () => {
      const result = getCurrentLine(null as any);

      // Assert
      expect(result).toBeNull();
    });

  });

  describe('getStartOfCodeBlock', () => {
    it('should return current method line where cursor is positioned', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getFullSignatureOfLine('public', editor, 28);

      // Assert
      expect(result?.signature).toEqual('public Task<int> GetNewIdAsync<TNewType>(string name,string address,string city,string state) where TNewType : TType');
      expect(result?.signatureType).toEqual(SignatureType.Method);
    });

    it('should return current read only property line where cursor is positioned', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getFullSignatureOfLine('public', editor, 11);

      // Assert
      expect(result?.signature).toEqual('public int MyPropertyLamda');
      expect(result?.signatureType).toEqual(SignatureType.LambaProperty);
    });

    it('should return current full property line where cursor is positioned', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getFullSignatureOfLine('public', editor, 17);

      // Assert
      expect(result?.signature).toEqual('public string FullPropertyAlt');
      expect(result?.signatureType).toEqual(SignatureType.FullProperty);
    });

    it('should return null when no matching signature', () => {
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getFullSignatureOfLine('protected', editor, 28);

      // Assert
      expect(result?.signature).toBeNull();
      expect(result?.signatureType).toEqual(SignatureType.Unknown);
    });

  });

  describe('getMethodSignatureText', () => {
    it('should return current method line when cursor is positioned in the member body', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(37, 0)));

      const result = getMethodSignatureText(editor);

      // Assert
      expect(result?.signature).toEqual('Task<int> GetNewIdAsync<TNewType>(string name,string address,string city,string state) where TNewType : TType');
      expect(result?.signatureType).toEqual(SignatureType.Method);
    });

    it('should return null when when cursor is positioned in property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(21, 0)));

      const result = getMethodSignatureText(editor);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null  when cursor is positioned in full lambda property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(14, 0)));

      const result = getMethodSignatureText(editor);

      // Assert
      expect(result).toBeNull();
    });

  });

  describe('getPropertySignatureText', () => {
    it('should return null when cursor is positioned in the method body', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(37, 0)));

      const result = getPropertySignatureText(editor);

      // Assert
      expect(result).toBeNull();
    });

    it('should return current full property line when when cursor is positioned in property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(21, 0)));

      const result = getPropertySignatureText(editor);

      // Assert
      expect(result?.signature).toEqual('string FullPropertyAlt');
      expect(result?.signatureType).toEqual(SignatureType.FullProperty);
    });

    it('should return current auto property line when when cursor is positioned in property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(10, 0)));

      const result = getPropertySignatureText(editor);

      // Assert
      expect(result?.signature).toEqual('int MyProperty');
      expect(result?.signatureType).toEqual(SignatureType.FullProperty);
    });

    it('should return current lamda read only property line when when cursor is positioned in property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(11, 0)));

      const result = getPropertySignatureText(editor);

      // Assert
      expect(result?.signature).toEqual('int MyPropertyLamda');
      expect(result?.signatureType).toEqual(SignatureType.LambaProperty);
    });

    it('should return current full lambda property line  when cursor is positioned in full lambda property', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(14, 0)));

      const result = getPropertySignatureText(editor);

      // Assert
      expect(result?.signature).toEqual('string FullProperty');
      expect(result?.signatureType).toEqual(SignatureType.FullProperty);
    });

  });

  describe('getLineEnding', () => {
    it('should CRLF as line ending', () => {
      // Act
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getLineEnding(editor);

      // Assert
      expect(result).toEqual('\n');
    });
  });

  describe('getUsingStatements', () => {
    it('should return array of using statements', () => {
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const editor = new MockTextEditor(jest, doc, undefined, new Selection(new Position(1, 0), new Position(1, 0)));

      const result = getUsingStatements(editor);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual('using System;\n');
    });
  });

  describe('replaceUsingStatements', () => {
    it('should return array of using statements', () => {
      var doc = vscodeMock.createTextDocument(Uri.parse('C:\temp\test.cs'), testFile, 'csharp');
      const result = replaceUsingStatementsFromText(doc.getText(), ['using NoMatch;'], '\n');
      expect(result).toContain('using NoMatch;');
      const items = getUsingStatementsFromText(result);
      expect(items).toHaveLength(1);
    });
  });

});


